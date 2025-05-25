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
		log.Printf("Raw request body: %v", string(c.Body()))
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

	// First, try to decode into a slice of bson.M to inspect the raw data
	var rawTests []bson.M
	if err := cursor.All(context.Background(), &rawTests); err != nil {
		log.Printf("Failed to decode raw tests: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode tests"})
	}

	// Now convert each raw test into our Test struct
	tests = make([]models.Test, len(rawTests))
	for i, rawTest := range rawTests {
		// Convert _id to string
		if id, ok := rawTest["_id"].(primitive.ObjectID); ok {
			tests[i].ID = id.Hex()
		}

		// Convert title
		if title, ok := rawTest["title"].(string); ok {
			tests[i].Title = title
		}

		// Convert description
		if desc, ok := rawTest["description"].(string); ok {
			tests[i].Description = desc
		}

		// Convert startTime
		if startTime, ok := rawTest["startTime"].(primitive.DateTime); ok {
			tests[i].StartTime = time.Unix(int64(startTime)/1000, 0)
		}

		// Convert endTime
		if endTime, ok := rawTest["endTime"].(primitive.DateTime); ok {
			tests[i].EndTime = time.Unix(int64(endTime)/1000, 0)
		}

		// Convert duration
		if duration, ok := rawTest["duration"].(int32); ok {
			tests[i].Duration = int(duration)
		}

		// Convert questions array
		if questions, ok := rawTest["questions"].(primitive.A); ok {
			tests[i].Questions = make([]string, len(questions))
			for j, q := range questions {
				if qID, ok := q.(primitive.ObjectID); ok {
					tests[i].Questions[j] = qID.Hex()
				} else if qStr, ok := q.(string); ok {
					tests[i].Questions[j] = qStr
				}
			}
		}

		// Convert allowedStudents array
		if students, ok := rawTest["allowedStudents"].(primitive.A); ok {
			tests[i].AllowedStudents = make([]string, len(students))
			for j, s := range students {
				if sID, ok := s.(primitive.ObjectID); ok {
					tests[i].AllowedStudents[j] = sID.Hex()
				} else if sStr, ok := s.(string); ok {
					tests[i].AllowedStudents[j] = sStr
				}
			}
		}
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

	// Validate student ID
	if submission.StudentID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	// Validate test ID
	if submission.TestID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Test ID is required"})
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
