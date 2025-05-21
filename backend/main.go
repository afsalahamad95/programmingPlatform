package main

import (
	"context"
	"log"
	"os"
	"time"

	"qms-backend/db"
	"qms-backend/handlers"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Configure logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("Starting Question Management System backend...")

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using default configuration")
	}

	// Get configuration from environment
	port := getEnvWithDefault("PORT", "3000")
	mongoURI := getEnvWithDefault("MONGODB_URI", "mongodb://localhost:27017")
	dbName := getEnvWithDefault("DB_NAME", "qms")
	allowedOrigins := getEnvWithDefault("ALLOWED_ORIGINS", "*")
	logLevel := getEnvWithDefault("LOG_LEVEL", "debug")

	// Connect to MongoDB with retry logic
	var client *mongo.Client
	var err error
	maxRetries := 5
	retryInterval := time.Second * 3

	for i := 0; i < maxRetries; i++ {
		log.Printf("Attempting to connect to MongoDB (attempt %d/%d)...\n", i+1, maxRetries)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		clientOptions := options.Client().ApplyURI(mongoURI)
		client, err = mongo.Connect(ctx, clientOptions)

		if err == nil {
			// Test the connection
			if err = client.Ping(ctx, nil); err == nil {
				log.Printf("Successfully connected to MongoDB database: %s\n", dbName)
				break
			}
		}

		log.Printf("Failed to connect to MongoDB: %v\n", err)
		if i < maxRetries-1 {
			log.Printf("Retrying in %v seconds...\n", retryInterval/time.Second)
			time.Sleep(retryInterval)
		}
	}

	if err != nil {
		log.Fatal("Failed to connect to MongoDB after maximum retries")
	}

	// Initialize database collections
	db.InitDB(client.Database(dbName))
	log.Println("Database collections initialized")

	// Create Fiber app with custom error handling
	app := fiber.New(fiber.Config{
		AppName:               "QMS Backend v1.0",
		EnablePrintRoutes:     logLevel == "debug",
		DisableStartupMessage: true,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
		Output: os.Stdout,
	}))

	// CORS middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
	}))

	// Health check endpoint
	app.Get("/health", handlers.HealthCheck)
	app.Get("/api/health", handlers.HealthCheck)

	// API routes
	api := app.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/login", handlers.Login)
	auth.Post("/register", handlers.Register)
	auth.Get("/oauth/:provider", handlers.OAuthRedirect)
	auth.Get("/oauth/:provider/callback", handlers.OAuthCallback)

	// Protected routes - requires authentication middleware
	protectedApi := api.Group("/protected")
	protectedApi.Use(handlers.AuthMiddleware())
	protectedApi.Get("/user", handlers.GetCurrentUser)

	// Admin routes - requires authentication and admin role
	adminApi := api.Group("/admin-protected")
	adminApi.Use(handlers.AuthMiddleware(), handlers.RoleMiddleware("admin"))

	// Questions routes
	questions := api.Group("/questions")
	questions.Post("/", handlers.CreateQuestion)
	questions.Get("/", handlers.GetQuestions)
	questions.Get("/:id", handlers.GetQuestion)
	questions.Put("/:id", handlers.UpdateQuestion)
	questions.Delete("/:id", handlers.DeleteQuestion)

	// Tests routes
	tests := api.Group("/tests")
	tests.Post("/", handlers.CreateTest)
	tests.Get("/", handlers.GetTests)
	tests.Get("/:id", handlers.GetTest)
	tests.Put("/:id", handlers.UpdateTest)
	tests.Delete("/:id", handlers.DeleteTest)
	tests.Post("/:id/submit", handlers.SubmitTest)

	// Users routes
	users := api.Group("/users")
	users.Post("/", handlers.CreateUser)
	users.Get("/", handlers.GetUsers)
	users.Get("/:id", handlers.GetUser)
	users.Put("/:id", handlers.UpdateUser)
	users.Delete("/:id", handlers.DeleteUser)

	// Coding Challenges routes
	challenges := api.Group("/challenges")
	challenges.Post("/", handlers.CreateChallenge)
	challenges.Get("/", handlers.GetChallenges)
	challenges.Get("/:id", handlers.GetChallenge)
	challenges.Put("/:id", handlers.UpdateChallenge)
	challenges.Delete("/:id", handlers.DeleteChallenge)
	challenges.Post("/:id/submit", handlers.SubmitChallengeAttempt)
	challenges.Get("/:id/attempts", handlers.GetChallengeAttempts)
	challenges.Get("/user/:userId/attempts", handlers.GetUserChallengeAttempts)

	// Students routes
	students := api.Group("/students")
	students.Post("/", handlers.CreateStudent)
	students.Get("/", handlers.GetStudents)
	students.Get("/:id", handlers.GetStudent)
	students.Put("/:id", handlers.UpdateStudent)
	students.Delete("/:id", handlers.DeleteStudent)

	// Admin routes for student results
	admin := api.Group("/admin")
	admin.Get("/student-results", handlers.GetAllStudentResults)
	admin.Get("/students", handlers.GetStudents)     // Reuse the existing handler
	admin.Get("/challenges", handlers.GetChallenges) // Reuse the existing handler
	admin.Get("/student-results/:studentId", handlers.GetStudentResultsByStudent)
	admin.Get("/student-results/challenge/:challengeId", handlers.GetStudentResultsByChallenge)

	// Log configuration
	log.Printf("Environment: %s\n", getEnvWithDefault("GO_ENV", "development"))
	log.Printf("Log Level: %s\n", logLevel)
	log.Printf("Server starting on port %s...\n", port)
	log.Printf("API endpoints available at http://localhost:%s/api\n", port)
	log.Printf("Health check available at http://localhost:%s/health\n", port)
	log.Printf("CORS allowed origins: %s\n", allowedOrigins)

	// Start server with graceful shutdown
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
