package services

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// Global MongoDB client reference to check health
var MongoClient *mongo.Client

// CheckDatabaseHealth checks if the database connection is working properly
func CheckDatabaseHealth() (string, error) {
	if MongoClient == nil {
		return "disconnected", nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err := MongoClient.Ping(ctx, readpref.Primary())
	if err != nil {
		return "disconnected", err
	}

	return "connected", nil
}

// CheckAPIHealth checks if the API service is running properly
func CheckAPIHealth() (string, error) {
	// Since we're checking from within the API itself, if this code executes,
	// the API is running. In a more complex system, we might want to check
	// dependencies or other services here.
	return "running", nil
}
