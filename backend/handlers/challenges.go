package handlers

import (
	"context"
	"fmt"
	"time"

	"qms-backend/db"
	"qms-backend/models"
	"qms-backend/services"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateChallenge creates a new coding challenge
func CreateChallenge(c *fiber.Ctx) error {
	challenge := new(models.CodingChallenge)
	if err := c.BodyParser(challenge); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	challenge.CreatedAt = time.Now()
	result, err := db.ChallengesCollection.InsertOne(context.Background(), challenge)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create challenge"})
	}

	challenge.ID = result.InsertedID.(primitive.ObjectID)
	return c.Status(201).JSON(challenge)
}

// GetChallenges retrieves all coding challenges
func GetChallenges(c *fiber.Ctx) error {
	var challenges []models.CodingChallenge

	// Query parameters for filtering
	difficulty := c.Query("difficulty")
	category := c.Query("category")

	// Build the filter
	filter := bson.M{}
	if difficulty != "" {
		filter["difficulty"] = difficulty
	}
	if category != "" {
		filter["category"] = category
	}

	// Set up options for sorting
	findOptions := options.Find()
	findOptions.SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := db.ChallengesCollection.Find(context.Background(), filter, findOptions)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch challenges"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &challenges); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse challenges"})
	}

	return c.JSON(challenges)
}

// GetChallenge retrieves a single coding challenge by ID
func GetChallenge(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
			"error":   err.Error(),
		})
	}

	var challenge models.CodingChallenge
	err = db.ChallengesCollection.FindOne(c.Context(), bson.M{"_id": id}).Decode(&challenge)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{
				"success": false,
				"message": "Challenge not found",
				"error":   "No challenge found with the provided ID",
			})
		}
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch challenge",
			"error":   err.Error(),
		})
	}

	return c.Status(200).JSON(challenge)
}

// UpdateChallenge updates a coding challenge
func UpdateChallenge(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	challenge := new(models.CodingChallenge)
	if err := c.BodyParser(challenge); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	update := bson.M{
		"$set": challenge,
	}

	result, err := db.ChallengesCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update challenge"})
	}

	if result.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Challenge not found"})
	}

	return c.JSON(challenge)
}

// DeleteChallenge deletes a coding challenge
func DeleteChallenge(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	result, err := db.ChallengesCollection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete challenge"})
	}

	if result.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Challenge not found"})
	}

	return c.SendStatus(204)
}

// SubmitChallengeAttempt handles a user's submission for a coding challenge
func SubmitChallengeAttempt(c *fiber.Ctx) error {
	// Log the raw request body for debugging
	var rawBody map[string]interface{}
	if err := c.BodyParser(&rawBody); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error":   "Invalid request body format",
			"details": err.Error(),
		})
	}

	fmt.Printf("Received challenge submission body: %+v\n", rawBody)

	// Now parse into the proper struct
	attempt := new(models.ChallengeAttempt)
	if err := c.BodyParser(attempt); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error":   "Invalid request body structure",
			"details": err.Error(),
		})
	}

	// Validate required fields
	if attempt.Code == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Code is required"})
	}

	if attempt.Language == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Language is required"})
	}

	// Set the attempt creation time
	attempt.CreatedAt = time.Now()

	// Parse and set the challenge ID from the URL
	challengeID, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error":   "Invalid challenge ID format",
			"details": err.Error(),
		})
	}
	attempt.ChallengeID = challengeID

	// Handle the userId - if it's empty or invalid, create a default ObjectID
	if attempt.UserID.IsZero() {
		// Check if we got a userId as string that we need to convert
		if userIDStr, ok := rawBody["userId"].(string); ok && userIDStr != "" {
			userID, err := primitive.ObjectIDFromHex(userIDStr)
			if err != nil {
				fmt.Printf("Error converting userId %s to ObjectID: %v\n", userIDStr, err)
				// If invalid, create a default ID
				attempt.UserID = primitive.NewObjectID()
			} else {
				attempt.UserID = userID
			}
		} else {
			// No userId provided, create a default one
			attempt.UserID = primitive.NewObjectID()
		}
	}

	// Validate the challenge ID
	var challenge models.CodingChallenge
	err = db.ChallengesCollection.FindOne(context.Background(), bson.M{"_id": challengeID}).Decode(&challenge)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{"error": "Challenge not found"})
		}
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to fetch challenge",
			"details": err.Error(),
		})
	}

	// Execute the code and get the validation result
	executionService := services.NewCodeExecutionService()
	validationResult, err := executionService.ExecuteCode(&challenge, attempt.Code)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Code execution failed",
			"details": err.Error(),
		})
	}

	// Update the attempt with the validation result
	attempt.Result = *validationResult
	attempt.Status = "Submitted"
	if validationResult.Passed {
		attempt.Status = "Passed"
	} else {
		attempt.Status = "Failed"
	}

	// Save the attempt to the database
	result, err := db.ChallengeAttemptsCollection.InsertOne(context.Background(), attempt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error":   "Failed to record challenge attempt",
			"details": err.Error(),
		})
	}

	attempt.ID = result.InsertedID.(primitive.ObjectID)
	return c.Status(201).JSON(attempt)
}

// GetChallengeAttempts retrieves all attempts for a specific challenge
func GetChallengeAttempts(c *fiber.Ctx) error {
	challengeID, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid challenge ID"})
	}

	var attempts []models.ChallengeAttempt
	cursor, err := db.ChallengeAttemptsCollection.Find(
		context.Background(),
		bson.M{"challengeId": challengeID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch challenge attempts"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse challenge attempts"})
	}

	return c.JSON(attempts)
}

// GetUserChallengeAttempts retrieves all attempts by a specific user
func GetUserChallengeAttempts(c *fiber.Ctx) error {
	userID, err := primitive.ObjectIDFromHex(c.Params("userId"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var attempts []models.ChallengeAttempt
	cursor, err := db.ChallengeAttemptsCollection.Find(
		context.Background(),
		bson.M{"userId": userID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user challenge attempts"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse user challenge attempts"})
	}

	return c.JSON(attempts)
}
