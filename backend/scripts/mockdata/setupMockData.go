package main

import (
	"context"
	"log"
	"os"
	"time"

	"qms-backend/db"
	"qms-backend/models"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default configuration")
	}

	// Get MongoDB URI from environment
	mongoURI := getEnvWithDefault("MONGODB_URI", "mongodb://localhost:27017")
	dbName := getEnvWithDefault("DB_NAME", "qms")

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(ctx)

	// Initialize database collections
	db.InitDB(client.Database(dbName))
	log.Println("Database collections initialized")

	// Setup initial student data
	setupMockStudent(ctx)

	log.Println("Mock data setup completed successfully")
}

func setupMockStudent(ctx context.Context) {
	log.Println("Setting up mock student data...")

	// Check if the student already exists
	var existingStudent models.Student
	err := db.StudentsCollection.FindOne(ctx, bson.M{"basicInfo.email": "john.doe@university.edu"}).Decode(&existingStudent)
	if err == nil {
		log.Println("Mock student already exists, skipping creation")
		return
	}

	// Create mock student
	student := models.Student{
		BasicInfo: models.BasicInfo{
			Name:            "John Doe",
			Email:           "john.doe@university.edu",
			GraduationYear:  2025,
			Branch:          "Computer Science",
			University:      "Tech University",
			CurrentSemester: 6,
			Points:          450,
		},
		TechnicalSkills: models.TechnicalSkills{
			ProgrammingLanguages: []string{"JavaScript", "Python", "Java", "C++"},
			Frameworks:           []string{"React", "Node.js", "Express", "Django"},
			Tools:                []string{"Git", "Docker", "AWS", "MongoDB"},
		},
		Projects: []models.Project{
			{
				ID:           "1",
				Name:         "E-commerce Platform",
				Role:         "Full Stack Developer",
				Technologies: []string{"React", "Node.js", "MongoDB", "Express"},
				StartDate:    "2023-09-01",
				EndDate:      "2023-12-31",
				Description:  "Built a full-featured e-commerce platform with user authentication, product management, and payment integration.",
				Links: models.ProjectLinks{
					Github: "https://github.com/johndoe/ecommerce",
					Live:   "https://ecommerce-demo.example.com",
				},
			},
		},
		Achievements: []models.Achievement{
			{
				ID:          "1",
				Title:       "Hackathon Winner",
				Date:        "2023-11-15",
				Description: "Won first place in the University Annual Hackathon for developing an innovative AI-powered solution.",
			},
		},
		Certifications: []models.Certification{
			{
				ID:            "1",
				Name:          "AWS Certified Cloud Practitioner",
				Provider:      "Amazon Web Services",
				IssueDate:     "2023-08-01",
				ExpiryDate:    "2026-08-01",
				CredentialURL: "https://aws.amazon.com/certification/verify",
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result, err := db.StudentsCollection.InsertOne(ctx, student)
	if err != nil {
		log.Fatalf("Failed to insert mock student: %v", err)
	}

	log.Printf("Inserted mock student with ID: %v", result.InsertedID)
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
