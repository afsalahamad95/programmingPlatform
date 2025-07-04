package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type CodingChallenge struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	Title         string              `json:"title" bson:"title"`
	Description   string              `json:"description" bson:"description"`
	Difficulty    string              `json:"difficulty" bson:"difficulty"` // Easy, Medium, Hard
	Category      string              `json:"category" bson:"category"`
	TimeLimit     int                 `json:"timeLimit" bson:"timeLimit"` // Time limit in minutes
	StarterCode   string              `json:"starterCode" bson:"starterCode"`
	SolutionCode  string              `json:"solutionCode,omitempty" bson:"solutionCode,omitempty"` // For admin reference
	Language      string              `json:"language" bson:"language"`
	TestCases     []ChallengeTestCase `json:"testCases" bson:"testCases"`
	MemoryLimitMB int                 `json:"memoryLimitMB" bson:"memoryLimitMB"`
	TimeoutSec    int                 `json:"timeoutSec" bson:"timeoutSec"`
	CreatedAt     time.Time           `json:"createdAt" bson:"createdAt"`
	EndTime       *time.Time          `json:"endTime,omitempty" bson:"endTime,omitempty"` // When the challenge ends
}

type ChallengeTestCase struct {
	Input           string  `json:"input" bson:"input"`
	ExpectedOutput  string  `json:"expectedOutput" bson:"expectedOutput"`
	Description     string  `json:"description" bson:"description"`
	Hidden          bool    `json:"hidden" bson:"hidden"`                                       // Hidden test cases are not shown to users
	PointsAvailable float64 `json:"pointsAvailable,omitempty" bson:"pointsAvailable,omitempty"` // Max points for this test case
}

type ChallengeAttempt struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID      primitive.ObjectID `json:"userId" bson:"userId"`
	ChallengeID primitive.ObjectID `json:"challengeId" bson:"challengeId"`
	Code        string             `json:"code" bson:"code"`
	Language    string             `json:"language" bson:"language"`
	Status      string             `json:"status" bson:"status"` // "Submitted", "Passed", "Failed"
	Result      ValidationResult   `json:"result" bson:"result"`
	TimeSpent   int                `json:"timeSpent" bson:"timeSpent"` // Time spent in seconds
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt"`
}

type ValidationResult struct {
	Passed          bool         `json:"passed" bson:"passed"`
	TestCases       []TestResult `json:"testCases" bson:"testCases"`
	TotalTests      int          `json:"totalTests" bson:"totalTests"`
	PassedTests     int          `json:"passedTests" bson:"passedTests"`
	FailedTests     int          `json:"failedTests" bson:"failedTests"`
	TotalPoints     float64      `json:"totalPoints" bson:"totalPoints"`         // Total points available
	ScoredPoints    float64      `json:"scoredPoints" bson:"scoredPoints"`       // Points earned
	PercentageScore float64      `json:"percentageScore" bson:"percentageScore"` // Overall score (0-100)
}

type TestResult struct {
	Passed          bool    `json:"passed" bson:"passed"`
	Input           string  `json:"input" bson:"input"`
	ExpectedOutput  string  `json:"expectedOutput" bson:"expectedOutput"`
	ActualOutput    string  `json:"actualOutput" bson:"actualOutput"`
	Description     string  `json:"description" bson:"description"`
	Hidden          bool    `json:"hidden" bson:"hidden"`
	Stderr          string  `json:"stderr,omitempty" bson:"stderr,omitempty"`
	SimilarityScore float64 `json:"similarityScore,omitempty" bson:"similarityScore,omitempty"` // How closely output matches (0-1)
	PointsAvailable float64 `json:"pointsAvailable,omitempty" bson:"pointsAvailable,omitempty"` // Max points for test case
	PointsScored    float64 `json:"pointsScored,omitempty" bson:"pointsScored,omitempty"`       // Points awarded
}
