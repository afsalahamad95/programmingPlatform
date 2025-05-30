package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Test represents the test document structure for API responses
type Test struct {
	ID              string     `json:"id,omitempty" bson:"_id,omitempty"`
	Title           string     `json:"title" bson:"title"`
	Description     string     `json:"description" bson:"description"`
	StartTime       time.Time  `json:"startTime" bson:"startTime"`
	EndTime         time.Time  `json:"endTime" bson:"endTime"`
	Duration        int        `json:"duration" bson:"duration"`
	Questions       []Question `json:"questions" bson:"questions"`             // Slice of full Question objects for API response
	AllowedStudents []string   `json:"allowedStudents" bson:"allowedStudents"` // Updated to string for parsing
}

// TestBSON represents the test document structure as stored in MongoDB
type TestBSON struct {
	ID              primitive.ObjectID   `json:"id,omitempty" bson:"_id,omitempty"`
	Title           string               `json:"title" bson:"title"`
	Description     string               `json:"description" bson:"description"`
	StartTime       time.Time            `json:"startTime" bson:"startTime"`
	EndTime         time.Time            `json:"endTime" bson:"endTime"`
	Duration        int                  `json:"duration" bson:"duration"`
	Questions       []primitive.ObjectID `json:"questions" bson:"questions"`             // Slice of Question ObjectIDs as stored in DB
	AllowedStudents []string             `json:"allowedStudents" bson:"allowedStudents"` // Slice of Student IDs as stored in DB (assuming strings)
}

type TestSubmission struct {
	ID           string    `json:"id,omitempty" bson:"_id,omitempty"`
	TestID       string    `json:"testId" bson:"testId"`
	StudentID    string    `json:"studentId" bson:"studentId"`
	StudentName  string    `json:"studentName" bson:"studentName"`
	StudentEmail string    `json:"studentEmail" bson:"studentEmail"`
	TimeSpent    int       `json:"timeSpent" bson:"timeSpent"` // Time spent in seconds
	SubmittedAt  time.Time `json:"submittedAt" bson:"submittedAt"`
	Answers      []Answer  `json:"answers" bson:"answers"`
}

type Answer struct {
	QuestionID string `json:"questionId" bson:"questionId"`
	Answer     string `json:"answer" bson:"answer"`
}
