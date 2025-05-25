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

	log.Printf("Current working directory: %s", dir)

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
		log.Println("No Google credential files found. Will try looking in subdirectories...")

		// Use a more extensive search if not found in the usual places
		// TODO: use WalkDir instead of Walk for better performance
		err = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			if !info.IsDir() && strings.Contains(info.Name(), "client_secret_") && strings.HasSuffix(info.Name(), ".json") {
				files = append(files, path)
				log.Printf("Found credential file during walk: %s", path)
			}
			return nil
		})

		if err != nil {
			log.Printf("Error walking directory: %v", err)
		}

		if len(files) == 0 {
			log.Println("WARNING: No Google credential files found after searching subdirectories.")
			log.Println("Google OAuth will not work without credentials.")
			return
		}
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
		log.Printf("File content: %s", string(data))
		return
	}

	// Update the Google OAuth config
	if config.Web.ClientID != "" && config.Web.ClientSecret != "" {
		log.Println("Successfully loaded Google OAuth credentials from JSON file")

		redirectURL := "http://localhost:3000/api/auth/oauth/google/callback"
		if len(config.Web.RedirectURIs) > 0 && config.Web.RedirectURIs[0] != "" {
			redirectURL = config.Web.RedirectURIs[0]
		}

		oauthConfigs["google"] = &oauth2.Config{
			ClientID:     config.Web.ClientID,
			ClientSecret: config.Web.ClientSecret,
			RedirectURL:  redirectURL,
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
			Endpoint:     google.Endpoint,
		}

		log.Printf("Google OAuth configured with ClientID: %s..., RedirectURL: %s",
			truncateString(config.Web.ClientID, 10),
			redirectURL)
	} else {
		log.Println("WARNING: Google OAuth client credentials are empty in the JSON file.")
	}
}

// Helper function to safely truncate strings
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
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

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login handles user authentication
func Login(c *fiber.Ctx) error {
	// Parse the login request
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		log.Printf("Error parsing login request: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Find the user by email
	var user models.AuthUser
	err := db.UsersCollection.FindOne(context.Background(), bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		log.Printf("User not found for email %s: %v", req.Email, err)
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Check password hash
	if !CheckPasswordHash(req.Password, user.PasswordHash) {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	// Generate JWT token
	token, err := GenerateJWT(user)
	if err != nil {
		log.Printf("Failed to generate token: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	// Return the user data and token
	return c.JSON(fiber.Map{
		"token": token,
		"user": fiber.Map{
			"id":        user.ID,
			"email":     user.Email,
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"role":      user.Role,
		},
	})
}

// Logout handles user logout
func Logout(c *fiber.Ctx) error {
	// Get the session token from the cookie
	token := c.Cookies("session_token")
	if token == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "No session token found"})
	}

	// Delete the session from the database
	_, err := db.SessionsCollection.DeleteOne(context.Background(), bson.M{"token": token})
	if err != nil {
		log.Printf("Failed to delete session: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to logout"})
	}

	// Clear the session cookie
	c.Cookie(&fiber.Cookie{
		Name:     "session_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
	})

	return c.SendStatus(http.StatusOK)
}

// GetCurrentUser returns the current user's information
func GetCurrentUser(c *fiber.Ctx) error {
	// Get the session token from the cookie
	token := c.Cookies("session_token")
	if token == "" {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Not authenticated"})
	}

	// Find the session in the database
	var session models.Session
	err := db.SessionsCollection.FindOne(context.Background(), bson.M{"token": token}).Decode(&session)
	if err != nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid session"})
	}

	// Check if the session has expired
	if time.Now().After(session.ExpiresAt) {
		// Delete the expired session
		db.SessionsCollection.DeleteOne(context.Background(), bson.M{"token": token})
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Session expired"})
	}

	// Find the user
	var user models.User
	err = db.UsersCollection.FindOne(context.Background(), bson.M{"_id": session.UserID}).Decode(&user)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to get user information"})
	}

	// Return the user data (excluding sensitive information)
	return c.JSON(fiber.Map{
		"id":          user.ID,
		"email":       user.Email,
		"fullName":    user.FullName,
		"institution": user.Institution,
		"department":  user.Department,
		"studentId":   user.StudentID,
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

	// Detailed debug info
	log.Printf("DEBUG - Checking OAuth config for %s:", provider)
	log.Printf("  - ClientID: %s", truncateString(config.ClientID, 10))
	log.Printf("  - ClientSecret: %s", truncateString(config.ClientSecret, 5))
	log.Printf("  - RedirectURL: %s", config.RedirectURL)
	log.Printf("  - Scopes: %v", config.Scopes)

	// Check for empty OAuth credentials
	if config.ClientID == "" || config.ClientSecret == "" {
		log.Printf("ERROR: Empty OAuth credentials for provider: %s", provider)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "OAuth is not properly configured. Please check server configuration.",
		})
	}

	// Generate a random state to prevent CSRF
	state, err := generateState()
	if err != nil {
		log.Printf("Failed to generate state: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate state",
		})
	}

	// Store the state in a cookie
	cookie := &fiber.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Expires:  time.Now().Add(15 * time.Minute),
		HTTPOnly: true,
		SameSite: "Lax",
	}

	log.Printf("Setting OAuth state cookie: %s=%s, Expires: %v",
		cookie.Name, truncateString(cookie.Value, 10), cookie.Expires)

	c.Cookie(cookie)

	// Redirect to the OAuth provider
	url := config.AuthCodeURL(state)
	log.Printf("Redirecting to OAuth URL: %s", url)

	// Try-catch equivalent to handle panic during redirect
	defer func() {
		if r := recover(); r != nil {
			log.Printf("PANIC during OAuth redirect: %v", r)
		}
	}()

	return c.Redirect(url, http.StatusTemporaryRedirect)
}

// OAuthCallback handles the callback from the OAuth provider
func OAuthCallback(c *fiber.Ctx) error {
	provider := c.Params("provider")
	log.Printf("OAuth callback received for provider: %s", provider)

	// Get all request parameters for debugging
	log.Printf("Callback URL: %s", c.OriginalURL())
	log.Printf("All query parameters: %s", c.Query("*"))

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
	errorParam := c.Query("error")
	errorDescription := c.Query("error_description")

	// Check if there's an error from the OAuth provider
	if errorParam != "" {
		log.Printf("ERROR: OAuth provider returned error: %s - %s", errorParam, errorDescription)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             "OAuth provider returned an error: " + errorParam,
			"error_description": errorDescription,
		})
	}

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
	log.Printf("OAuth state cookie value: %s", cookie)

	if cookie == "" || cookie != state {
		log.Printf("Invalid state parameter. Cookie: %s, State: %s", cookie, state)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid state parameter",
		})
	}

	// Exchange the code for a token
	log.Printf("Exchanging authorization code for token...")
	token, err := config.Exchange(context.Background(), code)
	if err != nil {
		log.Printf("Failed to exchange code for token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to exchange code for token",
			"details": err.Error(),
		})
	}

	log.Printf("Successfully obtained access token")

	// Get the user info from the provider
	var userInfo models.OAuthUserInfo
	var fetchErr error

	log.Printf("Fetching user info from %s...", provider)
	switch provider {
	case "google":
		userInfo, fetchErr = getGoogleUserInfo(token.AccessToken)
	case "github":
		userInfo, fetchErr = getGithubUserInfo(token.AccessToken)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Unsupported OAuth provider",
		})
	}

	if fetchErr != nil {
		log.Printf("Failed to get user info from provider: %v", fetchErr)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Failed to get user info from provider",
			"details": fetchErr.Error(),
		})
	}

	log.Printf("Successfully fetched user info: Email=%s, Name=%s",
		userInfo.Email, userInfo.Name)

	// Check if the user exists
	log.Printf("Checking if user exists in database...")
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
		log.Printf("User not found in database, creating new user...")
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
		log.Printf("Inserting new user into database: %s %s (%s)",
			user.FirstName, user.LastName, user.Email)

		_, err = db.UsersCollection.InsertOne(context.Background(), user)
		if err != nil {
			log.Printf("Failed to create user: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create user",
			})
		}
		log.Printf("New user created successfully with ID: %s", user.ID.Hex())
	} else if err != nil {
		log.Printf("Error checking if user exists: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to check if user exists",
		})
	} else {
		log.Printf("User found in database: ID=%s, Email=%s", user.ID.Hex(), user.Email)
	}

	// Generate JWT token
	log.Printf("Generating JWT token for user ID: %s", user.ID.Hex())
	jwtToken, err := GenerateJWT(user)
	if err != nil {
		log.Printf("Failed to generate authentication token: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate authentication token",
		})
	}
	log.Printf("JWT token generated successfully")

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
	redirectURL := fmt.Sprintf("%s/oauth-callback?token=%s", frontendURL, jwtToken)
	log.Printf("Redirecting to frontend: %s", redirectURL)
	return c.Redirect(redirectURL, http.StatusTemporaryRedirect)
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
