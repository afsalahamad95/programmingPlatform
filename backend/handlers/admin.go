package handlers

import (
	"context"
	"fmt"
	"net/http"
	"qms-backend/db"
	"qms-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// StudentResultResponse represents the combined data we need for the admin frontend
type StudentResultResponse struct {
	StudentID       string  `json:"studentId"`
	StudentName     string  `json:"studentName"`
	StudentEmail    string  `json:"studentEmail"`
	ChallengeID     string  `json:"challengeId"`
	ChallengeTitle  string  `json:"challengeTitle"`
	Status          string  `json:"status"`
	PercentageScore float64 `json:"percentageScore"`
	PointsScored    float64 `json:"pointsScored"`
	TotalPoints     float64 `json:"totalPoints"`
	TimeSpent       int     `json:"timeSpent"` // in seconds
	SubmittedAt     string  `json:"submittedAt"`
}

// Get student name and email from the Student model
func getStudentInfo(student models.Student) (string, string) {
	return student.BasicInfo.Name, student.BasicInfo.Email
}

// GetAllStudentResults retrieves all student challenge attempt results with student and challenge details
func GetAllStudentResults(c *fiber.Ctx) error {
	// First get all challenge attempts
	var attempts []models.ChallengeAttempt
	cursor, err := db.ChallengeAttemptsCollection.Find(
		context.Background(),
		bson.M{},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch challenge attempts"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse challenge attempts"})
	}

	// Prepare the results
	var results []StudentResultResponse

	// Cache for challenges and students to avoid multiple DB lookups
	challengeCache := make(map[string]models.CodingChallenge)
	studentCache := make(map[string]models.Student)

	for _, attempt := range attempts {
		// Get challenge details from cache or database
		var challenge models.CodingChallenge
		challengeID := attempt.ChallengeID.Hex()

		if cachedChallenge, found := challengeCache[challengeID]; found {
			challenge = cachedChallenge
		} else {
			if err := db.ChallengesCollection.FindOne(
				context.Background(),
				bson.M{"_id": attempt.ChallengeID},
			).Decode(&challenge); err != nil {
				fmt.Printf("Error fetching challenge %s: %v\n", challengeID, err)
				continue
			}
			challengeCache[challengeID] = challenge
		}

		// Get student details from cache or database
		var student models.Student
		studentID := attempt.UserID.Hex()

		if cachedStudent, found := studentCache[studentID]; found {
			student = cachedStudent
		} else {
			if err := db.StudentsCollection.FindOne(
				context.Background(),
				bson.M{"_id": attempt.UserID},
			).Decode(&student); err != nil {
				fmt.Println("Error fetching student, inserting a placeholder...", attempt.UserID, err)
				// If we can't find the student, create a placeholder
				if err == mongo.ErrNoDocuments {
					student = models.Student{
						ID: attempt.UserID,
						BasicInfo: models.BasicInfo{
							Name:  "Unknown Student",
							Email: "unknown@example.com",
						},
					}
				} else {
					fmt.Printf("Error fetching student %s: %v\n", studentID, err)
					continue
				}
			}
			studentCache[studentID] = student
		}

		// Map the data to our response format
		studentName, studentEmail := getStudentInfo(student)
		result := StudentResultResponse{
			StudentID:       studentID,
			StudentName:     studentName,
			StudentEmail:    studentEmail,
			ChallengeID:     challengeID,
			ChallengeTitle:  challenge.Title,
			Status:          attempt.Status,
			PercentageScore: attempt.Result.PercentageScore,
			PointsScored:    attempt.Result.ScoredPoints,
			TotalPoints:     attempt.Result.TotalPoints,
			TimeSpent:       attempt.TimeSpent,
			SubmittedAt:     attempt.CreatedAt.Format(time.RFC3339),
		}

		results = append(results, result)
	}

	// If no results, return empty array instead of null
	if results == nil {
		fmt.Println("No results found for GetAllStudentResults")
		results = []StudentResultResponse{}
	}

	return c.JSON(results)
}

// GetStudentResultsByStudent retrieves all results for a specific student
func GetStudentResultsByStudent(c *fiber.Ctx) error {
	studentID, err := primitive.ObjectIDFromHex(c.Params("studentId"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid student ID"})
	}

	// First get all challenge attempts for this student
	var attempts []models.ChallengeAttempt
	cursor, err := db.ChallengeAttemptsCollection.Find(
		context.Background(),
		bson.M{"userId": studentID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch student attempts"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse student attempts"})
	}

	// Get student details
	var student models.Student
	if err := db.StudentsCollection.FindOne(
		context.Background(),
		bson.M{"_id": studentID},
	).Decode(&student); err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Student not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch student details"})
	}

	// Prepare the results with challenge details
	var results []StudentResultResponse
	for _, attempt := range attempts {
		// Get challenge details
		var challenge models.CodingChallenge
		if err := db.ChallengesCollection.FindOne(
			context.Background(),
			bson.M{"_id": attempt.ChallengeID},
		).Decode(&challenge); err != nil {
			fmt.Printf("Error fetching challenge %s: %v\n", attempt.ChallengeID.Hex(), err)
			continue
		}

		studentName, studentEmail := getStudentInfo(student)
		result := StudentResultResponse{
			StudentID:       studentID.Hex(),
			StudentName:     studentName,
			StudentEmail:    studentEmail,
			ChallengeID:     attempt.ChallengeID.Hex(),
			ChallengeTitle:  challenge.Title,
			Status:          attempt.Status,
			PercentageScore: attempt.Result.PercentageScore,
			PointsScored:    attempt.Result.ScoredPoints,
			TotalPoints:     attempt.Result.TotalPoints,
			TimeSpent:       attempt.TimeSpent,
			SubmittedAt:     attempt.CreatedAt.Format(time.RFC3339),
		}

		results = append(results, result)
	}

	// If no results, return empty array instead of null
	if results == nil {
		results = []StudentResultResponse{}
	}

	return c.JSON(results)
}

// GetStudentResultsByChallenge retrieves all student results for a specific challenge
func GetStudentResultsByChallenge(c *fiber.Ctx) error {
	challengeID, err := primitive.ObjectIDFromHex(c.Params("challengeId"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid challenge ID"})
	}

	// First get all attempts for this challenge
	var attempts []models.ChallengeAttempt
	cursor, err := db.ChallengeAttemptsCollection.Find(
		context.Background(),
		bson.M{"challengeId": challengeID},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}),
	)

	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch challenge attempts"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to parse challenge attempts"})
	}

	// Get challenge details
	var challenge models.CodingChallenge
	if err := db.ChallengesCollection.FindOne(
		context.Background(),
		bson.M{"_id": challengeID},
	).Decode(&challenge); err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Challenge not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch challenge details"})
	}

	// Prepare the results with student details
	var results []StudentResultResponse
	for _, attempt := range attempts {
		// Get student details
		var student models.Student
		if err := db.StudentsCollection.FindOne(
			context.Background(),
			bson.M{"_id": attempt.UserID},
		).Decode(&student); err != nil {
			// If we can't find the student, create a placeholder
			if err == mongo.ErrNoDocuments {
				fmt.Println("No student found, inserting a placeholder...", attempt.UserID)
				student = models.Student{
					ID: attempt.UserID,
					BasicInfo: models.BasicInfo{
						Name:  "Unknown Student",
						Email: "unknown@example.com",
					},
				}
			} else {
				fmt.Printf("Error fetching student %s: %v\n", attempt.UserID.Hex(), err)
				continue
			}
		}

		studentName, studentEmail := getStudentInfo(student)
		result := StudentResultResponse{
			StudentID:       attempt.UserID.Hex(),
			StudentName:     studentName,
			StudentEmail:    studentEmail,
			ChallengeID:     challengeID.Hex(),
			ChallengeTitle:  challenge.Title,
			Status:          attempt.Status,
			PercentageScore: attempt.Result.PercentageScore,
			PointsScored:    attempt.Result.ScoredPoints,
			TotalPoints:     attempt.Result.TotalPoints,
			TimeSpent:       attempt.TimeSpent,
			SubmittedAt:     attempt.CreatedAt.Format(time.RFC3339),
		}

		results = append(results, result)
	}

	// If no results, return empty array instead of null
	if results == nil {
		fmt.Println("No results found for GetStudentResultsByChallenge")
		results = []StudentResultResponse{}
	}

	return c.JSON(results)
}
