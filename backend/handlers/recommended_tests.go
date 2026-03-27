package handlers

import (
	"context"
	"net/http"
	"qms-backend/db"
	"qms-backend/presenter"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetRecommendedTests dynamically fetches questions matching the current user's role and preferences
// and packages them as a pseudo-test or recommended practice set.
func GetRecommendedTests(c *fiber.Ctx) error {
	// 1. Get current user ID from AuthMiddleware locals
	userIDStr := c.Locals("userId")
	if userIDStr == nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{"error": "User not authenticated"})
	}

	userID, err := primitive.ObjectIDFromHex(userIDStr.(string))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var user presenter.AuthUser
	err = db.UsersCollection.FindOne(context.Background(), bson.M{"_id": userID}).Decode(&user)
	if err != nil {
		// Fallback role if user not found (shouldn't happen with valid token)
		user.TargetRole = "fullstack"
		user.Preferences = []string{}
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
