package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"qms-backend/db"
	"qms-backend/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// CreateTest handles the creation of a new test
func CreateTest(c *fiber.Ctx) error {
	fmt.Println("Creating new test...")
	fmt.Printf("Request body: %s\n", string(c.Body()))

	var req models.CreateTestRequest
	if err := c.BodyParser(&req); err != nil {
		fmt.Printf("Error parsing test data: %v\n", err)
		fmt.Printf("Raw request body: %s\n", string(c.Body()))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Invalid test data: %v", err),
		})
	}

	// Validate required fields
	if req.Title == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Title is required",
		})
	}
	if req.Description == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Description is required",
		})
	}
	if req.StartTime.IsZero() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Start time is required",
		})
	}
	if req.EndTime.IsZero() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "End time is required",
		})
	}
	if req.Duration <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Duration must be greater than 0",
		})
	}

	// Convert question IDs to ObjectIDs
	var questionIDs []primitive.ObjectID
	for _, qID := range req.Questions {
		objID, err := primitive.ObjectIDFromHex(qID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Invalid question ID format: %s", qID),
			})
		}
		questionIDs = append(questionIDs, objID)
	}

	// Create TestBSON for database insertion
	testBSON := models.TestBSON{
		Title:           req.Title,
		Description:     req.Description,
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		Duration:        req.Duration,
		Questions:       questionIDs,
		AllowedStudents: req.AllowedStudents,
	}

	// Create test in database
	result, err := db.TestsCollection.InsertOne(context.Background(), testBSON)
	if err != nil {
		fmt.Printf("Error creating test: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create test: %v", err),
		})
	}

	createdTestID := result.InsertedID.(primitive.ObjectID)

	// Fetch the created test to return complete data
	var createdTestBSON models.TestBSON
	err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": createdTestID}).Decode(&createdTestBSON)
	if err != nil {
		fmt.Printf("Error fetching created test: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Test created but failed to fetch details",
		})
	}

	// Convert TestBSON to Test with full question details
	createdTest, err := hydrateTest(createdTestBSON)
	if err != nil {
		fmt.Printf("Error hydrating test: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Test created but failed to prepare response",
		})
	}

	// Broadcast the test update to all connected clients
	if hub := c.Locals("hub"); hub != nil {
		if h, ok := hub.(*Hub); ok {
			fmt.Printf("Broadcasting test update for test ID: %s\n", createdTestID.Hex())
			h.BroadcastTestUpdate(createdTestID.Hex())
		} else {
			fmt.Println("Hub found in context but type assertion failed")
		}
	} else {
		fmt.Println("No hub found in context")
	}

	return c.Status(fiber.StatusCreated).JSON(createdTest)
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

	// Compatibility: For MCQ questions, always set CorrectOption if CorrectAnswer is present
	for i, q := range test.Questions {
		if q.Type == "mcq" && q.CorrectAnswer != "" && len(q.Options) > 0 {
			for idx, opt := range q.Options {
				if opt == q.CorrectAnswer {
					test.Questions[i].CorrectOption = idx
					break
				}
			}
		}
	}

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
	// Parse the submission body into a map first to handle both formats
	var submissionMap map[string]interface{}
	if err := c.BodyParser(&submissionMap); err != nil {
		log.Printf("Error parsing submission body: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	fmt.Printf("[DEBUG] Received submission payload: %+v\n", submissionMap)

	// Create a new TestSubmission
	submission := &models.TestSubmission{
		TestID:      c.Params("id"),
		SubmittedAt: time.Now(),
	}

	// Extract common fields
	if studentID, ok := submissionMap["studentId"].(string); ok {
		submission.StudentID = studentID
	}
	if studentName, ok := submissionMap["studentName"].(string); ok {
		submission.StudentName = studentName
	}
	if studentEmail, ok := submissionMap["studentEmail"].(string); ok {
		submission.StudentEmail = studentEmail
	}
	if timeSpent, ok := submissionMap["timeSpent"].(float64); ok {
		submission.TimeSpent = int(timeSpent)
	}

	fmt.Printf("[DEBUG] Parsed studentId: %s, testId: %s\n", submission.StudentID, submission.TestID)

	// Handle answers in either format
	if answers, ok := submissionMap["answers"]; ok {
		fmt.Printf("[DEBUG] Raw answers: %+v\n", answers)
		switch v := answers.(type) {
		case []interface{}:
			// Array format
			for _, ans := range v {
				if answerMap, ok := ans.(map[string]interface{}); ok {
					answer := models.Answer{}
					if qID, ok := answerMap["questionId"].(string); ok {
						answer.QuestionID = qID
					}
					if ans, ok := answerMap["answer"].(string); ok {
						answer.Answer = ans
					}
					submission.Answers = append(submission.Answers, answer)
				}
			}
		case map[string]interface{}:
			// Object format (questionId -> answer)
			for qID, ans := range v {
				if answer, ok := ans.(string); ok {
					submission.Answers = append(submission.Answers, models.Answer{
						QuestionID: qID,
						Answer:     answer,
					})
				}
			}
		}
	}

	fmt.Printf("[DEBUG] Parsed answers: %+v\n", submission.Answers)

	// Validate required fields
	if submission.StudentID == "" {
		fmt.Printf("[DEBUG] 400 error: Student ID is required\n")
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}
	if submission.TestID == "" {
		fmt.Printf("[DEBUG] 400 error: Test ID is required\n")
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Test ID is required"})
	}
	if len(submission.Answers) == 0 {
		fmt.Printf("[DEBUG] 400 error: No answers provided\n")
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
	log.Printf("Successfully created test attempt with ID: %s", submission.ID)

	// Respond with the submission details
	return c.Status(http.StatusCreated).JSON(submission)
}

// GetTestAttempt retrieves a single test attempt by its ID
func GetTestAttempt(c *fiber.Ctx) error {
	attemptID := c.Params("attemptId")
	log.Printf("Received request for test attempt with ID: %s", attemptID)
	log.Printf("Request path: %s", c.Path())
	log.Printf("Request method: %s", c.Method())
	log.Printf("Request headers: %v", c.GetReqHeaders())

	// Try to convert to ObjectID first
	objID, err := primitive.ObjectIDFromHex(attemptID)
	if err != nil {
		log.Printf("Error converting attempt ID %s to ObjectID: %v", attemptID, err)
		// If conversion fails, try to find by string ID
		var submission models.TestSubmission
		err = db.AttemptCollection.FindOne(context.Background(), bson.M{"_id": attemptID}).Decode(&submission)
		if err != nil {
			if err == mongo.ErrNoDocuments {
				log.Printf("Test attempt with ID %s not found in database.", attemptID)
				return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Test attempt not found"})
			}
			log.Printf("Error fetching test attempt %s: %v", attemptID, err)
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch test attempt"})
		}
		log.Printf("Successfully found test attempt with string ID: %s", attemptID)
		return c.Status(http.StatusOK).JSON(submission)
	}

	// If we have a valid ObjectID, search by that
	var submission models.TestSubmission
	err = db.AttemptCollection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&submission)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("Test attempt with ObjectID %s not found in database.", objID.Hex())
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Test attempt not found"})
		}
		log.Printf("Error fetching test attempt %s: %v", objID.Hex(), err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch test attempt"})
	}

	log.Printf("Successfully found test attempt with ObjectID: %s", objID.Hex())
	// Return the found submission
	return c.Status(http.StatusOK).JSON(submission)
}

func isValidObjectID(id string) bool {
	// Try to convert to MongoDB ObjectID first
	if _, err := primitive.ObjectIDFromHex(id); err == nil {
		return true
	}

	// If that fails, check if it's a valid numeric string
	if _, err := strconv.Atoi(id); err == nil {
		return true
	}

	return false
}

// GetActiveTests retrieves all active tests (tests that have started but not ended)
func GetActiveTests(c *fiber.Ctx) error {
	fmt.Printf("GetActiveTests handler called\n")
	now := time.Now()

	filter := bson.M{
		"startTime": bson.M{
			"$lte": now,
		},
		"endTime": bson.M{
			"$gt": now,
		},
	}

	fmt.Printf("Querying active tests with filter: %+v\n", filter)
	cursor, err := db.TestsCollection.Find(context.Background(), filter)
	if err != nil {
		log.Printf("Failed to fetch active tests from DB: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch active tests"})
	}
	defer cursor.Close(context.Background())

	var testsBSON []models.TestBSON
	if err := cursor.All(context.Background(), &testsBSON); err != nil {
		log.Printf("Failed to decode active tests from DB: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode active tests"})
	}

	fmt.Printf("Found %d active tests\n", len(testsBSON))
	var tests []models.Test
	for _, testBSON := range testsBSON {
		test, err := hydrateTest(testBSON)
		if err != nil {
			log.Printf("Failed to hydrate test %s: %v", testBSON.ID.Hex(), err)
			continue
		}
		tests = append(tests, test)
	}

	return c.JSON(tests)
}

// GetScheduledTests retrieves all scheduled tests (tests that haven't started yet)
func GetScheduledTests(c *fiber.Ctx) error {
	fmt.Printf("GetScheduledTests handler called\n")
	now := time.Now()

	filter := bson.M{
		"startTime": bson.M{
			"$gt": now,
		},
	}

	fmt.Printf("Querying scheduled tests with filter: %+v\n", filter)
	cursor, err := db.TestsCollection.Find(context.Background(), filter)
	if err != nil {
		log.Printf("Failed to fetch scheduled tests from DB: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch scheduled tests"})
	}
	defer cursor.Close(context.Background())

	var testsBSON []models.TestBSON
	if err := cursor.All(context.Background(), &testsBSON); err != nil {
		log.Printf("Failed to decode scheduled tests from DB: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode scheduled tests"})
	}

	fmt.Printf("Found %d scheduled tests\n", len(testsBSON))
	var tests []models.Test
	for _, testBSON := range testsBSON {
		test, err := hydrateTest(testBSON)
		if err != nil {
			log.Printf("Failed to hydrate test %s: %v", testBSON.ID.Hex(), err)
			continue
		}
		tests = append(tests, test)
	}

	return c.JSON(tests)
}
