package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"qms-backend/db"
	"qms-backend/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreateQuestion(c *fiber.Ctx) error {
	question := new(models.Question)
	if err := c.BodyParser(question); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Ensure question type is lowercase
	question.Type = strings.ToLower(question.Type)

	question.CreatedAt = time.Now()
	result, err := db.QuestionsCollection.InsertOne(context.Background(), question)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create question"})
	}

	question.ID = result.InsertedID.(primitive.ObjectID)
	return c.Status(http.StatusCreated).JSON(question)
}

func GetQuestions(c *fiber.Ctx) error {
	var questions []models.Question
	cursor, err := db.QuestionsCollection.Find(context.Background(), bson.M{})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch questions"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &questions); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse questions"})
	}

	fmt.Printf("%+v", questions)

	return c.JSON(questions)
}

func GetQuestion(c *fiber.Ctx) error {
	// Parse ID from parameters
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
			"error":   err.Error(),
		})
	}

	// Find the question in the database
	var question models.Question
	err = db.QuestionsCollection.FindOne(c.Context(), bson.M{"_id": id}).Decode(&question)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Question not found",
				"error":   "No question found with the provided ID",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch question",
			"error":   err.Error(),
		})
	}

	// Log the question in a readable format (optional, improve logging in production)
	questionJSON, err := json.MarshalIndent(question, "", "    ")
	if err != nil {
		// Log error if JSON formatting fails (optional)
		fmt.Printf("Error formatting question JSON: %v\n", err)
	} else {
		// Log the question JSON (for debugging purposes)
		fmt.Printf("Question fetched: \n%s\n", string(questionJSON))
	}

	// Return the question object in the response
	return c.Status(http.StatusOK).JSON(question)
}

func UpdateQuestion(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	question := new(models.Question)
	if err := c.BodyParser(question); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Ensure question type is lowercase
	question.Type = strings.ToLower(question.Type)

	update := bson.M{
		"$set": question,
	}

	result, err := db.QuestionsCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update question"})
	}

	if result.MatchedCount == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Question not found"})
	}

	return c.JSON(question)
}

func DeleteQuestion(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	result, err := db.QuestionsCollection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete question"})
	}

	if result.DeletedCount == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Question not found"})
	}

	return c.SendStatus(http.StatusNoContent)
}
