package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"

	"qms-backend/models"
	"qms-backend/scripts/seedusers"
)

const (
	mongoURI = "mongodb://localhost:27017"
	dbName   = "programming-platform"
)

func main() {
	seedusers.SeedInitialUsers()
	mongoURI := getConfigWithDefault("MONGODB_URI", "mongodb://localhost:27017")
	// Connect to MongoDB
	ctx := context.Background()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(ctx)

	// Check connection
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}

	// Get users collection
	collection := client.Database(dbName).Collection("users")

	// Create default users
	defaultUsers := []models.User{
		{
			Email:       "admin@example.com",
			Password:    hashPassword("admin123"),
			FullName:    "Admin User",
			Institution: "Example University",
			Department:  "Computer Science",
			StudentID:   "ADMIN001",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
		{
			Email:       "student@example.com",
			Password:    hashPassword("student123"),
			FullName:    "Test Student",
			Institution: "Example University",
			Department:  "Computer Science",
			StudentID:   "STU001",
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		},
	}

	// Insert users
	for _, user := range defaultUsers {
		// Check if user already exists
		var existingUser models.User
		err := collection.FindOne(ctx, map[string]string{"email": user.Email}).Decode(&existingUser)
		if err == nil {
			fmt.Printf("User %s already exists, skipping...\n", user.Email)
			continue
		}

		// Insert new user
		result, err := collection.InsertOne(ctx, user)
		if err != nil {
			log.Printf("Error creating user %s: %v\n", user.Email, err)
			continue
		}

		fmt.Printf("Created user %s with ID: %v\n", user.Email, result.InsertedID)
	}

	fmt.Println("Seed completed successfully!")
}

func hashPassword(password string) string {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal(err)
	}
	return string(hashedPassword)
}

func getConfigWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
