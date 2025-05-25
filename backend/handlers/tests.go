package handlers

import (
	"context"
	"log"
	"net/http"
	"qms-backend/db"
	"qms-backend/models"
	"regexp"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// CreateTest handles creating a new test document
func CreateTest(c *fiber.Ctx) error {
	// Log the incoming request body for debugging purposes
	log.Printf("Incoming request body: %v", string(c.Body()))

	// Parse the incoming request body into the Test struct
	test := new(models.Test)
	if err := c.BodyParser(test); err != nil {
		log.Printf("Error unmarshalling body into Test struct: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Log the parsed Test object
	log.Printf("Parsed Test object: %+v", test)

	// Convert the allowedStudents (string IDs) into ObjectIDs after validation
	var allowedStudentIDs []string
	for _, studentIDStr := range test.AllowedStudents {
		// Validate if the studentID is a valid ObjectID
		if !isValidObjectID(studentIDStr) {
			log.Printf("Invalid student ID format: %v", studentIDStr)
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid student ID format"})
		}
		allowedStudentIDs = append(allowedStudentIDs, studentIDStr)
	}
	test.AllowedStudents = allowedStudentIDs

	// Convert the question IDs (string format) to ObjectIDs after validation
	var questionStrings []string
	for _, questionIDStr := range test.Questions {
		// Validate if the questionID is a valid ObjectID
		if !isValidObjectID(questionIDStr) {
			log.Printf("Invalid question ID format: %v", questionIDStr)
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid question ID format"})
		}
		questionStrings = append(questionStrings, questionIDStr)
	}

	// Set the validated strings back to the Test struct
	test.Questions = questionStrings

	// Log the parsed Test object with validated ObjectIDs
	log.Printf("Parsed Test object with ObjectIDs: %+v", test)

	// Insert the test document into the database
	result, err := db.TestsCollection.InsertOne(context.Background(), test)
	if err != nil {
		log.Printf("Failed to create test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create test"})
	}

	// Set the inserted ID on the Test object
	test.ID = result.InsertedID.(primitive.ObjectID).Hex()
	return c.Status(http.StatusCreated).JSON(test)
}

// GetTests retrieves all the tests from the database
func GetTests(c *fiber.Ctx) error {
	var tests []models.Test
	cursor, err := db.TestsCollection.Find(context.Background(), bson.M{})
	if err != nil {
		log.Printf("Failed to fetch tests: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tests"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &tests); err != nil {
		log.Printf("Failed to parse tests: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse tests"})
	}

	return c.JSON(tests)
}

// GetTest retrieves a single test by its ID
func GetTest(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		log.Printf("Invalid ID format: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var test models.Test
	err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&test)
	if err != nil {
		log.Printf("Test not found for ID %s: %v", id.Hex(), err)
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Test not found"})
	}

	return c.JSON(test)
}

// UpdateTest updates an existing test by its ID
func UpdateTest(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	test := new(models.Test)
	if err := c.BodyParser(test); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Convert and validate IDs, but keep as strings
	var allowedStudentIDs []string
	for _, studentIDStr := range test.AllowedStudents {
		// Validate if the studentID is a valid ObjectID
		if !isValidObjectID(studentIDStr) {
			log.Printf("Invalid student ID format: %v", studentIDStr)
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid student ID format"})
		}
		allowedStudentIDs = append(allowedStudentIDs, studentIDStr)
	}

	var questionStrings []string
	for _, questionIDStr := range test.Questions {
		// Validate if the questionID is a valid ObjectID
		if !isValidObjectID(questionIDStr) {
			log.Printf("Invalid question ID format: %v", questionIDStr)
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid question ID format"})
		}
		questionStrings = append(questionStrings, questionIDStr)
	}

	// Set the validated strings back to the Test struct
	test.AllowedStudents = allowedStudentIDs
	test.Questions = questionStrings

	// Filtering out the _id field (MongoDB doesn't allow updates to _id)
	update := bson.M{
		"$set": bson.M{
			"title":           test.Title,
			"description":     test.Description,
			"startTime":       test.StartTime,
			"endTime":         test.EndTime,
			"duration":        test.Duration,
			"questions":       test.Questions,
			"allowedStudents": test.AllowedStudents,
		},
	}

	result, err := db.TestsCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
	if err != nil {
		log.Printf("Failed to update test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update test"})
	}

	if result.MatchedCount == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Test not found"})
	}

	return c.JSON(test)
}

// DeleteTest deletes a test by its ID
func DeleteTest(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	result, err := db.TestsCollection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil {
		log.Printf("Failed to delete test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete test"})
	}

	if result.DeletedCount == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Test not found"})
	}

	return c.SendStatus(204)
}

// SubmitTest handles a test submission
func SubmitTest(c *fiber.Ctx) error {
	// Parse the submission body into the TestSubmission struct
	submission := new(models.TestSubmission)
	if err := c.BodyParser(submission); err != nil {
		log.Printf("Error parsing submission body: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Set the current submission timestamp
	submission.SubmittedAt = time.Now()

	// Ensure the submission has answers
	if len(submission.Answers) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "No answers provided"})
	}

	// Insert the submission into the database
	result, err := db.AttemptCollection.InsertOne(context.Background(), submission)
	if err != nil {
		log.Printf("Failed to submit test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to submit test"})
	}

	// Set the inserted ID on the submission object
	submission.ID = result.InsertedID.(primitive.ObjectID).Hex()

	// Respond with the submission details
	return c.Status(http.StatusCreated).JSON(submission)
}

func isValidObjectID(id string) bool {
	// Regular expression to check for valid 24-character hex string
	re := regexp.MustCompile("^[a-f0-9]{24}$")
	if re.MatchString(id) {
		return true
	}

	// Check if it's a valid numeric string (for cases like "1")
	_, err := strconv.Atoi(id)
	return err == nil
}
