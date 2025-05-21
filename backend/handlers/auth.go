package handlers

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"qms-backend/db"
	"qms-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
)

// JWT secret key from environment variable or using a default for development
var jwtSecret = []byte(getEnvWithDefault("JWT_SECRET", "your_default_secret_key_for_development"))

// Google OAuth config
type GoogleConfig struct {
	Web struct {
		ClientID     string   `json:"client_id"`
		ProjectID    string   `json:"project_id"`
		AuthURI      string   `json:"auth_uri"`
		TokenURI     string   `json:"token_uri"`
		ClientSecret string   `json:"client_secret"`
		RedirectURIs []string `json:"redirect_uris"`
	} `json:"web"`
}

// OAuth configuration for different providers
var oauthConfigs = map[string]*oauth2.Config{
	"google": {
		ClientID:     getEnvWithDefault("GOOGLE_CLIENT_ID", ""),
		ClientSecret: getEnvWithDefault("GOOGLE_CLIENT_SECRET", ""),
		RedirectURL:  getEnvWithDefault("GOOGLE_REDIRECT_URL", "http://localhost:3000/api/auth/oauth/google/callback"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	},
	"github": {
		ClientID:     getEnvWithDefault("GITHUB_CLIENT_ID", ""),
		ClientSecret: getEnvWithDefault("GITHUB_CLIENT_SECRET", ""),
		RedirectURL:  getEnvWithDefault("GITHUB_REDIRECT_URL", "http://localhost:3000/api/auth/oauth/github/callback"),
		Scopes:       []string{"user:email", "read:user"},
		Endpoint:     github.Endpoint,
	},
}

func init() {
	// Try to load the Google credentials from the JSON file
	log.Println("Attempting to load Google OAuth credentials from JSON file...")

	// Look for client secret files in the current directory
	dir, err := os.Getwd()
	if err != nil {
		log.Printf("Error getting current directory: %v", err)
		return
	}

	// First check in handlers directory
	files, err := filepath.Glob(filepath.Join(dir, "handlers", "client_secret_*.json"))
	if err != nil {
		log.Printf("Error looking for credential files in handlers: %v", err)
	}

	// If not found, check in root directory
	if len(files) == 0 {
		files, err = filepath.Glob(filepath.Join(dir, "client_secret_*.json"))
		if err != nil {
			log.Printf("Error looking for credential files in root: %v", err)
		}
	}

	if len(files) == 0 {
		log.Println("No Google credential files found")
		return
	}

	log.Printf("Found credential file: %s", files[0])

	// Read and parse the credential file
	data, err := os.ReadFile(files[0])
	if err != nil {
		log.Printf("Error reading credential file: %v", err)
		return
	}

	var config GoogleConfig
	err = json.Unmarshal(data, &config)
	if err != nil {
		log.Printf("Error parsing credential file: %v", err)
		return
	}

	// Update the Google OAuth config
	if config.Web.ClientID != "" && config.Web.ClientSecret != "" {
		log.Println("Successfully loaded Google OAuth credentials from JSON file")

		redirectURL := config.Web.RedirectURIs[0]
		if redirectURL == "" {
			redirectURL = "http://localhost:3000/api/auth/oauth/google/callback"
		}

		oauthConfigs["google"] = &oauth2.Config{
			ClientID:     config.Web.ClientID,
			ClientSecret: config.Web.ClientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
			Endpoint:     google.Endpoint,
		}

		log.Printf("Google OAuth configured with ClientID: %s..., RedirectURL: %s",
			config.Web.ClientID[:10]+"...",
			redirectURL)
	}
}

// Helper to get environment variable with default
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Generates a random state string for OAuth
func generateState() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(b), nil
}

// HashPassword hashes a plain text password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPasswordHash checks if the password matches the hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateJWT generates a JWT token for a user
func GenerateJWT(user models.AuthUser) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)

	claims := &jwt.MapClaims{
		"userId": user.ID.Hex(),
		"email":  user.Email,
		"role":   user.Role,
		"exp":    expirationTime.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)

	return tokenString, err
}

// Login handles email/password authentication
func Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	// Find the user by email
	var user models.AuthUser
	err := db.UsersCollection.FindOne(
		context.Background(),
		bson.M{"email": strings.ToLower(req.Email)},
	).Decode(&user)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid email or password",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check user credentials",
		})
	}

	// Check password
	if !CheckPasswordHash(req.Password, user.PasswordHash) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
		})
	}

	// Generate JWT token
	token, err := GenerateJWT(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate authentication token",
		})
	}

	// Return the user and token
	user.PasswordHash = "" // Don't send the password hash to the client
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"token": token,
		"user":  user,
		"role":  user.Role,
	})
}

// Register handles user registration
func Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "All fields are required",
		})
	}

	// Check if user already exists
	count, err := db.UsersCollection.CountDocuments(
		context.Background(),
		bson.M{"email": strings.ToLower(req.Email)},
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check if user exists",
		})
	}
	if count > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Email already in use",
		})
	}

	// Hash the password
	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process password",
		})
	}

	// Create new user
	now := time.Now()
	newUser := models.AuthUser{
		ID:           primitive.NewObjectID(),
		Email:        strings.ToLower(req.Email),
		PasswordHash: hashedPassword,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Role:         "user", // Default role
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	// Insert into database
	_, err = db.UsersCollection.InsertOne(context.Background(), newUser)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create user",
		})
	}

	// Generate JWT token
	token, err := GenerateJWT(newUser)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate authentication token",
		})
	}

	// Return the user and token
	newUser.PasswordHash = "" // Don't send the password hash to the client
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": token,
		"user":  newUser,
		"role":  newUser.Role,
	})
}

// OAuthRedirect redirects the user to the OAuth provider's authorization URL
func OAuthRedirect(c *fiber.Ctx) error {
	provider := c.Params("provider")
	log.Printf("OAuth redirect requested for provider: %s", provider)

	config, ok := oauthConfigs[provider]
	if !ok {
		log.Printf("Unsupported OAuth provider: %s", provider)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Unsupported OAuth provider",
		})
	}

	// Check for empty OAuth credentials
	if config.ClientID == "" || config.ClientSecret == "" {
		log.Printf("ERROR: Empty OAuth credentials for provider: %s", provider)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "OAuth is not properly configured. Please check server configuration.",
		})
	}

	// Log the OAuth configuration being used
	clientIdPreview := "empty"
	if len(config.ClientID) > 5 {
		clientIdPreview = config.ClientID[:5] + "..."
	} else if len(config.ClientID) > 0 {
		clientIdPreview = config.ClientID + "..."
	}

	log.Printf("OAuth config for %s: ClientID=%s, RedirectURL=%s",
		provider,
		clientIdPreview,
		config.RedirectURL)

	// Generate a random state to prevent CSRF
	state, err := generateState()
	if err != nil {
		log.Printf("Failed to generate state: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate state",
		})
	}

	// Store the state in a cookie
	c.Cookie(&fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Expires:  time.Now().Add(15 * time.Minute),
		HTTPOnly: true,
		SameSite: "Lax",
	})

	// Redirect to the OAuth provider
	url := config.AuthCodeURL(state)
	log.Printf("Redirecting to OAuth URL: %s", url)
	return c.Redirect(url, http.StatusTemporaryRedirect)
}

// OAuthCallback handles the callback from the OAuth provider
func OAuthCallback(c *fiber.Ctx) error {
	provider := c.Params("provider")
	log.Printf("OAuth callback received for provider: %s", provider)

	config, ok := oauthConfigs[provider]
	if !ok {
		log.Printf("Unsupported OAuth provider: %s", provider)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Unsupported OAuth provider",
		})
	}

	// Get the state and code from the query parameters
	state := c.Query("state")
	code := c.Query("code")

	// Check for empty code or state
	if code == "" {
		log.Printf("ERROR: Empty authorization code received from %s", provider)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No authorization code received from provider",
		})
	}

	// Safe logging that avoids index out of range errors
	codePreview := "empty"
	if len(code) > 5 {
		codePreview = code[:5] + "..."
	} else if len(code) > 0 {
		codePreview = code + "..."
	}
	log.Printf("OAuth callback received with state: %s and code: %s", state, codePreview)

	// Verify the state
	cookie := c.Cookies("oauth_state")
	if cookie == "" || cookie != state {
		log.Printf("Invalid state parameter. Cookie: %s, State: %s", cookie, state)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid state parameter",
		})
	}

	// Exchange the code for a token
	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		log.Printf("Failed to exchange code for token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to exchange code for token",
			"details": err.Error(),
		})
	}

	// Get the user info from the provider
	var userInfo models.OAuthUserInfo
	switch provider {
	case "google":
		userInfo, err = getGoogleUserInfo(token.AccessToken)
	case "github":
		userInfo, err = getGithubUserInfo(token.AccessToken)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Unsupported OAuth provider",
		})
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get user info from provider",
			"details": err.Error(),
		})
	}

	// Check if the user exists
	var user models.AuthUser
	err = db.UsersCollection.FindOne(
		context.Background(),
		bson.M{
			"$or": []bson.M{
				{"email": strings.ToLower(userInfo.Email)},
				{"oauthId": userInfo.ID, "oauthProvider": provider},
			},
		},
	).Decode(&user)

	// If the user doesn't exist, create a new one
	if err == mongo.ErrNoDocuments {
		// Create a new user
		now := time.Now()
		user = models.AuthUser{
			ID:            primitive.NewObjectID(),
			Email:         strings.ToLower(userInfo.Email),
			FirstName:     userInfo.FirstName,
			LastName:      userInfo.LastName,
			Role:          "user", // Default role
			OAuthID:       userInfo.ID,
			OAuthProvider: provider,
			CreatedAt:     now,
			UpdatedAt:     now,
		}

		// If first/last name not available, split the full name
		if user.FirstName == "" && user.LastName == "" && userInfo.Name != "" {
			parts := strings.Split(userInfo.Name, " ")
			user.FirstName = parts[0]
			if len(parts) > 1 {
				user.LastName = strings.Join(parts[1:], " ")
			}
		}

		// Insert into database
		_, err = db.UsersCollection.InsertOne(context.Background(), user)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create user",
			})
		}
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check if user exists",
		})
	}

	// Generate JWT token
	jwtToken, err := GenerateJWT(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate authentication token",
		})
	}

	// Set a cookie with the JWT token
	c.Cookie(&fiber.Cookie{
		Name:     "auth_token",
		Value:    jwtToken,
		Expires:  time.Now().Add(24 * time.Hour),
		HTTPOnly: true,
		SameSite: "Lax",
	})

	// Redirect to the frontend with the token
	frontendURL := getEnvWithDefault("FRONTEND_URL", "http://localhost:5176")
	return c.Redirect(fmt.Sprintf("%s/oauth-callback?token=%s", frontendURL, jwtToken), http.StatusTemporaryRedirect)
}

// getGoogleUserInfo gets the user info from Google
func getGoogleUserInfo(accessToken string) (models.OAuthUserInfo, error) {
	var userInfo models.OAuthUserInfo
	// Make a request to Google's userinfo endpoint
	res, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + accessToken)
	if err != nil {
		return userInfo, err
	}
	defer res.Body.Close()

	// Parse the response
	var data map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return userInfo, err
	}

	// Extract the user info
	userInfo.ID = fmt.Sprintf("%v", data["id"])
	userInfo.Email = fmt.Sprintf("%v", data["email"])
	userInfo.Name = fmt.Sprintf("%v", data["name"])
	userInfo.Picture = fmt.Sprintf("%v", data["picture"])

	// Try to get first and last name
	if given, ok := data["given_name"]; ok {
		userInfo.FirstName = fmt.Sprintf("%v", given)
	}
	if family, ok := data["family_name"]; ok {
		userInfo.LastName = fmt.Sprintf("%v", family)
	}

	return userInfo, nil
}

// getGithubUserInfo gets the user info from GitHub
func getGithubUserInfo(accessToken string) (models.OAuthUserInfo, error) {
	var userInfo models.OAuthUserInfo

	// Make a request to GitHub's user endpoint
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return userInfo, err
	}

	req.Header.Set("Authorization", "token "+accessToken)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return userInfo, err
	}
	defer res.Body.Close()

	// Parse the response
	var data map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil {
		return userInfo, err
	}

	// Extract the user info
	userInfo.ID = fmt.Sprintf("%v", data["id"])
	userInfo.Name = fmt.Sprintf("%v", data["name"])

	// Get email from primary email endpoint
	emailReq, err := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	if err != nil {
		return userInfo, err
	}

	emailReq.Header.Set("Authorization", "token "+accessToken)
	emailRes, err := http.DefaultClient.Do(emailReq)
	if err != nil {
		return userInfo, err
	}
	defer emailRes.Body.Close()

	// Parse the email response
	var emails []map[string]interface{}
	if err := json.NewDecoder(emailRes.Body).Decode(&emails); err != nil {
		return userInfo, err
	}

	// Find the primary email
	for _, email := range emails {
		if primary, ok := email["primary"].(bool); ok && primary {
			userInfo.Email = fmt.Sprintf("%v", email["email"])
			break
		}
	}

	// If no primary email found, use the first one
	if userInfo.Email == "" && len(emails) > 0 {
		userInfo.Email = fmt.Sprintf("%v", emails[0]["email"])
	}

	// Parse the name into first and last name
	if userInfo.Name != "" {
		parts := strings.Split(userInfo.Name, " ")
		userInfo.FirstName = parts[0]
		if len(parts) > 1 {
			userInfo.LastName = strings.Join(parts[1:], " ")
		}
	}

	return userInfo, nil
}

// AuthMiddleware protects routes that require authentication
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get the Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header is required",
			})
		}

		// Check if the header is in the correct format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Authorization header must be in the format: Bearer [token]",
			})
		}

		// Parse the token
		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate the algorithm
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		// Check for errors
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Check if the token is valid
		if !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// Extract the claims
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token claims",
			})
		}

		// Check if the token is expired
		exp, ok := claims["exp"].(float64)
		if !ok || float64(time.Now().Unix()) > exp {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Token has expired",
			})
		}

		// Set the user ID and role in the context
		userID, _ := claims["userId"].(string)
		role, _ := claims["role"].(string)
		c.Locals("userId", userID)
		c.Locals("userRole", role)

		// Continue to the next middleware/handler
		return c.Next()
	}
}

// RoleMiddleware checks if the user has the required role
func RoleMiddleware(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get the user role from the context (set by AuthMiddleware)
		role := c.Locals("userRole")
		if role == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User not authenticated",
			})
		}

		// Check if the user has one of the required roles
		userRole := role.(string)
		for _, r := range roles {
			if userRole == r {
				return c.Next()
			}
		}

		// If the user doesn't have any of the required roles
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access denied: insufficient permissions",
		})
	}
}

// GetCurrentUser gets the authenticated user's details
func GetCurrentUser(c *fiber.Ctx) error {
	// Get the user ID from the context (set by AuthMiddleware)
	userID := c.Locals("userId")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not authenticated",
		})
	}

	// Convert the user ID to ObjectID
	id, err := primitive.ObjectIDFromHex(userID.(string))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Find the user
	var user models.AuthUser
	err = db.UsersCollection.FindOne(
		context.Background(),
		bson.M{"_id": id},
	).Decode(&user)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user details",
		})
	}

	// Return the user details
	user.PasswordHash = "" // Don't send the password hash to the client
	return c.Status(fiber.StatusOK).JSON(user)
}
