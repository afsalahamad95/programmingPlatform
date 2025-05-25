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
	"go.mongodb.org/mongo-driver/mongo"
)

// CreateTest handles creating a new test document
func CreateTest(c *fiber.Ctx) error {
	// We expect question IDs and allowed student IDs as strings in the incoming request
	type CreateTestRequest struct {
		Title           string    `json:"title"`
		Description     string    `json:"description"`
		StartTime       time.Time `json:"startTime"`
		EndTime         time.Time `json:"endTime"`
		Duration        int       `json:"duration"`
		Questions       []string  `json:"questions"`
		AllowedStudents []string  `json:"allowedStudents"`
	}

	req := new(CreateTestRequest)
	if err := c.BodyParser(req); err != nil {
		log.Printf("Error unmarshalling body into CreateTestRequest struct: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Prepare the TestBSON model for DB insertion
	testBSON := models.TestBSON{
		Title:           req.Title,
		Description:     req.Description,
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		Duration:        req.Duration,
		AllowedStudents: req.AllowedStudents, // Assign strings directly
	}

	// Convert question string IDs to ObjectIDs for DB storage
	for _, qIDStr := range req.Questions {
		objID, err := primitive.ObjectIDFromHex(qIDStr)
		if err != nil {
			log.Printf("Invalid question ID format in create request: %v", qIDStr)
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid question ID format"})
		}
		testBSON.Questions = append(testBSON.Questions, objID)
	}

	// Insert the test document into the database
	result, err := db.TestsCollection.InsertOne(context.Background(), testBSON)
	if err != nil {
		log.Printf("Failed to create test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create test"})
	}

	// Fetch and return the created test with full question details (similar to GetTest logic)
	createdTestID := result.InsertedID.(primitive.ObjectID)
	var createdTestBSON models.TestBSON
	err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": createdTestID}).Decode(&createdTestBSON)
	if err != nil {
		log.Printf("Failed to fetch created test after insertion: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve created test details"})
	}

	// Convert TestBSON to models.Test (fetch questions)
	createdTest, err := hydrateTest(createdTestBSON)
	if err != nil {
		log.Printf("Failed to hydrate created test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to prepare created test response"})
	}

	return c.Status(http.StatusCreated).JSON(createdTest)
}

// GetTests retrieves all the tests from the database with full question details
func GetTests(c *fiber.Ctx) error {
	now := time.Now()

	filter := bson.M{
		"endTime": bson.M{
			"$gt": now,
		},
	}

	cursor, err := db.TestsCollection.Find(context.Background(), filter)
	if err != nil {
		log.Printf("Failed to fetch tests from DB: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tests"})
	}
	defer cursor.Close(context.Background())

	var testsBSON []models.TestBSON
	if err := cursor.All(context.Background(), &testsBSON); err != nil {
		log.Printf("Failed to decode tests from DB into TestBSON: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode tests"})
	}

	var tests []models.Test // Slice to hold tests with full Question objects
	for _, testBSON := range testsBSON {
		test, err := hydrateTest(testBSON)
		if err != nil {
			log.Printf("Failed to hydrate test %s: %v", testBSON.ID.Hex(), err)
			// Decide how to handle hydration errors for multiple tests
			continue // Skip this test on hydration error
		}
		tests = append(tests, test)
	}

	return c.JSON(tests)
}

// GetTest retrieves a single test by its ID with full question details
func GetTest(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		log.Printf("Invalid ID format: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	now := time.Now()
	filter := bson.M{
		"_id": id,
		"endTime": bson.M{
			"$gt": now,
		},
	}

	var testBSON models.TestBSON
	err = db.TestsCollection.FindOne(context.Background(), filter).Decode(&testBSON)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("Test not found or expired for ID %s: %v", id.Hex(), err)
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Test not found or has expired"})
		}
		log.Printf("Error fetching test from DB: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch test"})
	}

	// Convert TestBSON to models.Test (fetch questions)
	test, err := hydrateTest(testBSON)
	if err != nil {
		log.Printf("Failed to hydrate test %s: %v", testBSON.ID.Hex(), err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to prepare test response"})
	}

	return c.JSON(test)
}

// UpdateTest updates an existing test by its ID
func UpdateTest(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	// We expect question IDs and allowed student IDs as strings in the incoming request
	type UpdateTestRequest struct {
		Title           string    `json:"title"`
		Description     string    `json:"description"`
		StartTime       time.Time `json:"startTime"`
		EndTime         time.Time `json:"endTime"`
		Duration        int       `json:"duration"`
		Questions       []string  `json:"questions"`
		AllowedStudents []string  `json:"allowedStudents"`
	}

	req := new(UpdateTestRequest)
	if err := c.BodyParser(req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Prepare the update data for DB (using TestBSON structure for DB update)
	updateBSON := bson.M{
		"$set": bson.M{
			"title":           req.Title,
			"description":     req.Description,
			"startTime":       req.StartTime,
			"endTime":         req.EndTime,
			"duration":        req.Duration,
			"allowedStudents": req.AllowedStudents, // Assign strings directly
		},
	}

	// Convert question string IDs to ObjectIDs for DB update
	var questionIDsForDB []primitive.ObjectID
	for _, qIDStr := range req.Questions {
		objID, err := primitive.ObjectIDFromHex(qIDStr)
		if err != nil {
			log.Printf("Invalid question ID format in update request: %v", qIDStr)
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid question ID format"})
		}
		questionIDsForDB = append(questionIDsForDB, objID)
	}
	updateBSON["$set"].(bson.M)["questions"] = questionIDsForDB

	result, err := db.TestsCollection.UpdateOne(context.Background(), bson.M{"_id": id}, updateBSON)
	if err != nil {
		log.Printf("Failed to update test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update test"})
	}

	if result.MatchedCount == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Test not found"})
	}

	// After updating, fetch and return the full test object with questions (similar logic to GetTest)
	var updatedTestBSON models.TestBSON
	err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&updatedTestBSON)
	if err != nil {
		log.Printf("Failed to fetch updated test after update: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve updated test details"})
	}

	updatedTest, err := hydrateTest(updatedTestBSON)
	if err != nil {
		log.Printf("Failed to hydrate updated test: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to prepare updated test response"})
	}

	return c.JSON(updatedTest)
}

// hydrateTest fetches full Question objects for a TestBSON and converts it to models.Test
func hydrateTest(testBSON models.TestBSON) (models.Test, error) {
	var test models.Test

	// Copy basic fields from TestBSON
	test.ID = testBSON.ID.Hex()
	test.Title = testBSON.Title
	test.Description = testBSON.Description
	test.StartTime = testBSON.StartTime
	test.EndTime = testBSON.EndTime
	test.Duration = testBSON.Duration

	// Convert allowed student ObjectIDs to strings for the response
	// Since TestBSON.AllowedStudents is now []string, simply assign or copy
	test.AllowedStudents = testBSON.AllowedStudents

	var questions []models.Question
	// Fetch full question details using the ObjectIDs from TestBSON
	if len(testBSON.Questions) > 0 {
		cursor, err := db.QuestionsCollection.Find(context.Background(), bson.M{
			"_id": bson.M{"$in": testBSON.Questions},
		})
		if err != nil {
			log.Printf("Failed to fetch questions for test %s during hydration: %v", testBSON.ID.Hex(), err)
			return models.Test{}, err // Return error to calling handler
		}
		defer cursor.Close(context.Background())

		if err := cursor.All(context.Background(), &questions); err != nil {
			log.Printf("Failed to decode questions for test %s during hydration: %v", testBSON.ID.Hex(), err)
			return models.Test{}, err // Return error to calling handler
		}
	}

	// Assign the fetched full question objects to the Test struct
	test.Questions = questions

	return test, nil
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
