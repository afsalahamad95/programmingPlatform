package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Question struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Type          string             `json:"type" bson:"type"`
	Subject       string             `json:"subject" bson:"subject"`
	Content       string             `json:"content" bson:"content"`
	Points        int                `json:"points" bson:"points"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	Options       []string           `json:"options,omitempty" bson:"options,omitempty"`
	CorrectOption int                `json:"correctOption,omitempty" bson:"correctOption,omitempty"`
	StarterCode   string             `json:"starterCode,omitempty" bson:"starterCode,omitempty"`
	TestCases     []TestCase         `json:"testCases,omitempty" bson:"testCases,omitempty"`
	CorrectAnswer string             `json:"correctAnswer,omitempty" bson:"correctAnswer,omitempty"`
}

type TestCase struct {
	Input  string `json:"input" bson:"input"`
	Output string `json:"output" bson:"output"`
	Hidden bool   `json:"hidden" bson:"hidden"`
}
