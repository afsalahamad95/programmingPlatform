package handlers

import (
	"context"
	"log"
	"net/http"
	"qms-backend/db"
	"qms-backend/presenter"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// buildResultFromAttempt converts a raw attempt + test into a response map
func buildResultFromAttempt(attempt presenter.TestSubmission, test presenter.TestData) fiber.Map {
	totalPoints := 0
	scoredPoints := 0
	for _, answer := range attempt.Answers {
		var question presenter.Question
		questionID, err := primitive.ObjectIDFromHex(answer.QuestionID)
		if err != nil {
			log.Printf("Invalid question ID format: %v", err)
			continue
		}
		err = db.QuestionsCollection.FindOne(context.Background(), bson.M{"_id": questionID}).Decode(&question)
		if err != nil {
			log.Printf("Failed to fetch question details: %v", err)
			continue
		}

		totalPoints += question.Points
		if question.Type == "mcq" {
			selectedIndex, err := strconv.ParseInt(answer.Answer, 10, 64)
			if err == nil && int(selectedIndex) == question.CorrectOption {
				scoredPoints += question.Points
			}
		}
	}

	percentageScore := 0.0
	if totalPoints > 0 {
		percentageScore = float64(scoredPoints) / float64(totalPoints) * 100
	}

	status := "Submitted"
	if percentageScore >= 70 {
		status = "Passed"
	} else if percentageScore > 0 {
		status = "Failed"
	}

	return fiber.Map{
		"id": attempt.ID, "studentId": attempt.StudentID,
		"studentName":     attempt.StudentName,
		"studentEmail":    attempt.StudentEmail,
		"testId":          attempt.TestID,
		"testTitle":       test.Title,
		"status":          status,
		"percentageScore": percentageScore,
		"pointsScored":    scoredPoints,
		"totalPoints":     totalPoints,
		"timeSpent":       attempt.TimeSpent,
		"submittedAt":     attempt.SubmittedAt.Format(time.RFC3339),
		"answers":         attempt.Answers,
	}
}

// GetTestResults handles fetching all test results (cached)
func GetTestResults(c *fiber.Ctx) error {
	cacheKey := CacheKey("test_results", "all")

	// Try cache first
	var cached []fiber.Map
	if CacheGet(c.Context(), cacheKey, &cached) {
		return c.JSON(cached)
	}

	var attempts []presenter.TestSubmission
	cursor, err := db.AttemptCollection.Find(
		context.Background(),
		bson.M{},
		options.Find().SetSort(bson.D{{Key: "submittedAt", Value: -1}}),
	)
	if err != nil {
		log.Printf("Failed to fetch test attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch test results"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		log.Printf("Failed to decode test attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode test results"})
	}

	var results []fiber.Map
	for _, attempt := range attempts {
		var test presenter.TestData
		testID, err := primitive.ObjectIDFromHex(attempt.TestID)
		if err != nil {
			log.Printf("Invalid test ID format: %v", err)
			continue
		}
		err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": testID}).Decode(&test)
		if err != nil {
			log.Printf("Failed to fetch test details: %v", err)
			continue
		}
		results = append(results, buildResultFromAttempt(attempt, test))
	}

	// Cache the result
	CacheSet(c.Context(), cacheKey, results, DefaultCacheTTL)

	return c.JSON(results)
}

// GetTestResultsByStudent handles fetching test results for a specific student (cached)
func GetTestResultsByStudent(c *fiber.Ctx) error {
	studentId := c.Params("studentId")
	if studentId == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	cacheKey := CacheKey("test_results", "student", studentId)

	var cached []fiber.Map
	if CacheGet(c.Context(), cacheKey, &cached) {
		return c.JSON(cached)
	}

	var attempts []presenter.TestSubmission
	cursor, err := db.AttemptCollection.Find(
		context.Background(),
		bson.M{"studentId": studentId},
		options.Find().SetSort(bson.D{{Key: "submittedAt", Value: -1}}),
	)
	if err != nil {
		log.Printf("Failed to fetch student attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch student results"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		log.Printf("Failed to decode student attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode student results"})
	}

	var results []fiber.Map
	for _, attempt := range attempts {
		var test presenter.TestData
		testID, err := primitive.ObjectIDFromHex(attempt.TestID)
		if err != nil {
			log.Printf("Invalid test ID format: %v", err)
			continue
		}
		err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": testID}).Decode(&test)
		if err != nil {
			log.Printf("Failed to fetch test details: %v", err)
			continue
		}
		results = append(results, buildResultFromAttempt(attempt, test))
	}

	CacheSet(c.Context(), cacheKey, results, DefaultCacheTTL)

	return c.JSON(results)
}

// GetTestResultsByTest handles fetching test results for a specific test (cached)
func GetTestResultsByTest(c *fiber.Ctx) error {
	testId := c.Params("testId")
	if testId == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Test ID is required"})
	}

	cacheKey := CacheKey("test_results", "test", testId)

	var cached []fiber.Map
	if CacheGet(c.Context(), cacheKey, &cached) {
		return c.JSON(cached)
	}

	var attempts []presenter.TestSubmission
	cursor, err := db.AttemptCollection.Find(
		context.Background(),
		bson.M{"testId": testId},
		options.Find().SetSort(bson.D{{Key: "submittedAt", Value: -1}}),
	)
	if err != nil {
		log.Printf("Failed to fetch test attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch test results"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		log.Printf("Failed to decode test attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode test results"})
	}

	// Get test details once
	var test presenter.TestData
	testID, err := primitive.ObjectIDFromHex(testId)
	if err != nil {
		log.Printf("Invalid test ID format: %v", err)
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid test ID format"})
	}
	err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": testID}).Decode(&test)
	if err != nil {
		log.Printf("Failed to fetch test details: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch test details"})
	}

	var results []fiber.Map
	for _, attempt := range attempts {
		results = append(results, buildResultFromAttempt(attempt, test))
	}

	CacheSet(c.Context(), cacheKey, results, DefaultCacheTTL)

	return c.JSON(results)
}
