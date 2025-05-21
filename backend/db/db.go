package db

import (
	"go.mongodb.org/mongo-driver/mongo"
)

var (
	QuestionsCollection         *mongo.Collection
	TestsCollection             *mongo.Collection
	UserCollection              *mongo.Collection
	AttemptCollection           *mongo.Collection
	ChallengesCollection        *mongo.Collection
	ChallengeAttemptsCollection *mongo.Collection
	StudentsCollection          *mongo.Collection
)

// InitDB initializes all the database collections
func InitDB(database *mongo.Database) {
	QuestionsCollection = database.Collection("questions")
	TestsCollection = database.Collection("tests")
	UserCollection = database.Collection("users")
	AttemptCollection = database.Collection("attempts")
	ChallengesCollection = database.Collection("coding_challenges")
	ChallengeAttemptsCollection = database.Collection("challenge_attempts")
	StudentsCollection = database.Collection("students")
}
