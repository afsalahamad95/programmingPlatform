package handlers

import (
	"github.com/gofiber/fiber/v2"
)

// GetTestResults handles fetching all test results
func GetTestResults(c *fiber.Ctx) error {
	// TODO: Implement fetching all test results from database
	// For now, return mock data
	return c.JSON([]fiber.Map{
		{
			"studentId":       "s1",
			"studentName":     "Jane Smith",
			"studentEmail":    "jane.smith@example.com",
			"testId":          "t1",
			"testTitle":       "JavaScript Fundamentals",
			"status":          "Passed",
			"percentageScore": 85.0,
			"pointsScored":    85,
			"totalPoints":     100,
			"timeSpent":       3600,
			"submittedAt":     "2024-03-15T14:30:00Z",
			"answers": []fiber.Map{
				{
					"questionId":   "q1",
					"questionType": "MCQ",
					"score":        20,
					"maxScore":     20,
				},
				{
					"questionId":   "q2",
					"questionType": "Subjective",
					"score":        15,
					"maxScore":     20,
				},
			},
		},
	})
}

// GetTestResultsByStudent handles fetching test results for a specific student
func GetTestResultsByStudent(c *fiber.Ctx) error {
	studentId := c.Params("studentId")
	if studentId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Student ID is required",
		})
	}

	// TODO: Implement fetching test results for specific student from database
	// For now, return mock data
	return c.JSON([]fiber.Map{
		{
			"studentId":       studentId,
			"studentName":     "Jane Smith",
			"studentEmail":    "jane.smith@example.com",
			"testId":          "t1",
			"testTitle":       "JavaScript Fundamentals",
			"status":          "Passed",
			"percentageScore": 85.0,
			"pointsScored":    85,
			"totalPoints":     100,
			"timeSpent":       3600,
			"submittedAt":     "2024-03-15T14:30:00Z",
			"answers": []fiber.Map{
				{
					"questionId":   "q1",
					"questionType": "MCQ",
					"score":        20,
					"maxScore":     20,
				},
				{
					"questionId":   "q2",
					"questionType": "Subjective",
					"score":        15,
					"maxScore":     20,
				},
			},
		},
	})
}

// GetTestResultsByTest handles fetching test results for a specific test
func GetTestResultsByTest(c *fiber.Ctx) error {
	testId := c.Params("testId")
	if testId == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Test ID is required",
		})
	}

	// TODO: Implement fetching test results for specific test from database
	// For now, return mock data
	return c.JSON([]fiber.Map{
		{
			"studentId":       "s1",
			"studentName":     "Jane Smith",
			"studentEmail":    "jane.smith@example.com",
			"testId":          testId,
			"testTitle":       "JavaScript Fundamentals",
			"status":          "Passed",
			"percentageScore": 85.0,
			"pointsScored":    85,
			"totalPoints":     100,
			"timeSpent":       3600,
			"submittedAt":     "2024-03-15T14:30:00Z",
			"answers": []fiber.Map{
				{
					"questionId":   "q1",
					"questionType": "MCQ",
					"score":        20,
					"maxScore":     20,
				},
				{
					"questionId":   "q2",
					"questionType": "Subjective",
					"score":        15,
					"maxScore":     20,
				},
			},
		},
	})
}
