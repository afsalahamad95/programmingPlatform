package db

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	Client                      *mongo.Client
	QuestionsCollection         *mongo.Collection
	TestsCollection             *mongo.Collection
	UsersCollection             *mongo.Collection
	AttemptCollection           *mongo.Collection
	ChallengesCollection        *mongo.Collection
	ChallengeAttemptsCollection *mongo.Collection
	StudentsCollection          *mongo.Collection
	SessionsCollection          *mongo.Collection
)

// Connect establishes a connection to MongoDB
func Connect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect to MongoDB
	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		return err
	}

	// Ping the database
	err = client.Ping(ctx, nil)
	if err != nil {
		return err
	}

	// Set up collections
	Client = client
	db := client.Database("qms")
	QuestionsCollection = db.Collection("questions")
	TestsCollection = db.Collection("tests")
	UsersCollection = db.Collection("users")
	AttemptCollection = db.Collection("attempts")
	ChallengesCollection = db.Collection("coding_challenges")
	ChallengeAttemptsCollection = db.Collection("challenge_attempts")
	StudentsCollection = db.Collection("students")
	SessionsCollection = db.Collection("sessions")

	log.Println("Connected to MongoDB!")
	return nil
}

// Disconnect closes the MongoDB connection
func Disconnect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return Client.Disconnect(ctx)
}

// InitDB initializes all the database collections
func InitDB(database *mongo.Database) {
	QuestionsCollection = database.Collection("questions")
	TestsCollection = database.Collection("tests")
	UsersCollection = database.Collection("users")
	AttemptCollection = database.Collection("attempts")
	ChallengesCollection = database.Collection("coding_challenges")
	ChallengeAttemptsCollection = database.Collection("challenge_attempts")
	StudentsCollection = database.Collection("students")
}
