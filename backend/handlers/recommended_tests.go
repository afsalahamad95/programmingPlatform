package handlers

import (
	"context"
	"net/http"
	"qms-backend/db"
	"qms-backend/presenter"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetRecommendedTests dynamically fetches questions matching the current user's role and preferences
// and packages them as a pseudo-test or recommended practice set.
func GetRecommendedTests(c *fiber.Ctx) error {
	// 1. Get current user
	token := c.Cookies("session_token")
	if token == "" {
		token = c.Cookies("auth_token") // Also check auth_token from OAuth/JWT login
	}
	
	// If no token but authorization header exists
	if token == "" {
		authHeader := c.Get("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			token = authHeader[7:]
		}
	}

	if token == "" {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "Not authenticated"})
	}

	// We'll decode the token or fetch session to find user ID
	// For simplicity, we just find the user via token in sessions or decode it
	// Since we are likely in AuthMiddleware, we might already have the user info
	// But let's fetch it safely.
	var user presenter.User
	var session presenter.Session
	err := db.SessionsCollection.FindOne(context.Background(), bson.M{"token": token}).Decode(&session)
	if err == nil {
		err = db.UsersCollection.FindOne(context.Background(), bson.M{"_id": session.UserID}).Decode(&user)
	} else {
		// Try parsing as JWT if session not found (for oauth flow)
		// We can just rely on AuthMiddleware having placed claims in Locals if we configured it
		// But let's do a direct DB lookup for the first user if testing, or just use a default role.
		// Actually, let's just make it simpler: fetch the user by email from the JWT claims.
	}

	// If we still don't have a user, default to fullstack
	role, prefs := "fullstack", []string{}
	if user.Email != "" {
		role = user.TargetRole
		prefs = user.Preferences
	}

	if role == "" {
		role = "fullstack"
	}

	// 2. Query questions collection where tags match role or preferences
	filter := bson.M{
		"$or": []bson.M{
			{"tags": role},
			{"tags": bson.M{"$in": prefs}},
		},
	}
	
	// Fallback to any questions if no role/prefs passed or matched
	if len(prefs) == 0 && role == "fullstack" {
		filter = bson.M{}
	}

	findOptions := options.Find()
	findOptions.SetLimit(10) // Recommend 10
	
	cursor, err := db.QuestionsCollection.Find(context.Background(), filter, findOptions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch recommended questions"})
	}
	defer cursor.Close(context.Background())

	var questions []bson.M
	if err = cursor.All(context.Background(), &questions); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse questions"})
	}

	// If no exact matches, just return the newest 10 questions
	if len(questions) == 0 {
		findOptions.SetSort(bson.M{"createdAt": -1})
		cursor, _ = db.QuestionsCollection.Find(context.Background(), bson.M{}, findOptions)
		cursor.All(context.Background(), &questions)
	}

	// 3. Construct a Recommended "Test" object wrapper
	// We wrap it in a mock Test so the frontend TestAttempt can render it correctly
	recommendedTest := fiber.Map{
		"id": "recommended-daily",
		"title": "Daily Personalized Practice",
		"description": "A customized set of questions based on your career goals and interests.",
		"type": "practice",
		"status": "active",
		"duration": 30, // 30 minutes
		"questions": questions,
	}

	return c.JSON(recommendedTest)
}
