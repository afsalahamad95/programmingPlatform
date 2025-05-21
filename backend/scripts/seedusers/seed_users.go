package seedusers

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type AuthUser struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Email        string             `json:"email" bson:"email"`
	PasswordHash string             `json:"-" bson:"passwordHash"`
	FirstName    string             `json:"firstName" bson:"firstName"`
	LastName     string             `json:"lastName" bson:"lastName"`
	Role         string             `json:"role" bson:"role"` // admin, instructor, or student
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt"`
}

func getConfigWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func hashUserPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// SeedInitialUsers creates initial admin and instructor users in the database
func SeedInitialUsers() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default configuration")
	}

	// Get configuration from environment
	mongoURI := getConfigWithDefault("MONGODB_URI", "mongodb://localhost:27017")
	dbName := getConfigWithDefault("DB_NAME", "qms")

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(mongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(ctx)

	// Check the connection
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}
	log.Printf("Connected to MongoDB at %s\n", mongoURI)

	// Get the users collection
	usersCollection := client.Database(dbName).Collection("users")

	// Check if admin user already exists
	adminEmail := "admin@example.com"
	var existingUser AuthUser
	err = usersCollection.FindOne(context.Background(), bson.M{"email": adminEmail}).Decode(&existingUser)
	if err != nil && err != mongo.ErrNoDocuments {
		log.Fatal("Error checking for existing admin:", err)
	}

	if err == mongo.ErrNoDocuments {
		// Create admin user
		hashedPassword, err := hashUserPassword("admin123")
		if err != nil {
			log.Fatal("Failed to hash password:", err)
		}

		now := time.Now()
		adminUser := AuthUser{
			ID:           primitive.NewObjectID(),
			Email:        adminEmail,
			PasswordHash: hashedPassword,
			FirstName:    "Admin",
			LastName:     "User",
			Role:         "admin",
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		_, err = usersCollection.InsertOne(context.Background(), adminUser)
		if err != nil {
			log.Fatal("Failed to insert admin user:", err)
		}

		fmt.Printf("Created admin user with email: %s and password: admin123\n", adminEmail)
	} else {
		fmt.Printf("Admin user already exists with email: %s\n", adminEmail)
	}

	// Create test instructor user
	instructorEmail := "instructor@example.com"
	err = usersCollection.FindOne(context.Background(), bson.M{"email": instructorEmail}).Decode(&existingUser)
	if err != nil && err != mongo.ErrNoDocuments {
		log.Fatal("Error checking for existing instructor:", err)
	}

	if err == mongo.ErrNoDocuments {
		hashedPassword, err := hashUserPassword("instructor123")
		if err != nil {
			log.Fatal("Failed to hash password:", err)
		}

		now := time.Now()
		instructorUser := AuthUser{
			ID:           primitive.NewObjectID(),
			Email:        instructorEmail,
			PasswordHash: hashedPassword,
			FirstName:    "Test",
			LastName:     "Instructor",
			Role:         "instructor",
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		_, err = usersCollection.InsertOne(context.Background(), instructorUser)
		if err != nil {
			log.Fatal("Failed to insert instructor user:", err)
		}

		fmt.Printf("Created instructor user with email: %s and password: instructor123\n", instructorEmail)
	} else {
		fmt.Printf("Instructor user already exists with email: %s\n", instructorEmail)
	}

	fmt.Println("User seeding completed successfully")
}
