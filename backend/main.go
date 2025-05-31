package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"qms-backend/db"
	"qms-backend/handlers"
	"qms-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
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
	// Configure logging to be more visible
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.SetOutput(os.Stdout)

	fmt.Println("==========================================")
	fmt.Println("Starting Question Management System backend...")
	fmt.Println("==========================================")

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		fmt.Println("No .env file found, using default configuration")
	}

	// Get configuration from environment
	port := getEnvWithDefault("PORT", "8080")
	mongoURI := getEnvWithDefault("MONGODB_URI", "mongodb://localhost:27017")
	dbName := getEnvWithDefault("DB_NAME", "qms")
	allowedOrigins := getEnvWithDefault("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	logLevel := getEnvWithDefault("LOG_LEVEL", "debug")

	fmt.Printf("Server will run on port: %s\n", port)
	fmt.Printf("MongoDB URI: %s\n", mongoURI)
	fmt.Printf("Database name: %s\n", dbName)

	// Connect to MongoDB with retry logic
	var client *mongo.Client
	var err error
	maxRetries := 5
	retryInterval := time.Second * 3

	for i := 0; i < maxRetries; i++ {
		fmt.Printf("Attempting to connect to MongoDB (attempt %d/%d)...\n", i+1, maxRetries)

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		clientOptions := options.Client().ApplyURI(mongoURI)
		client, err = mongo.Connect(ctx, clientOptions)

		if err == nil {
			// Test the connection
			if err = client.Ping(ctx, nil); err == nil {
				fmt.Printf("Successfully connected to MongoDB database: %s\n", dbName)
				break
			}
		}

		fmt.Printf("Failed to connect to MongoDB: %v\n", err)
		if i < maxRetries-1 {
			fmt.Printf("Retrying in %v seconds...\n", retryInterval/time.Second)
			time.Sleep(retryInterval)
		}
	}

	if err != nil {
		log.Fatal("Failed to connect to MongoDB after maximum retries")
	}

	// Store the MongoDB client for health checks
	services.MongoClient = client

	// Initialize database collections
	db.InitDB(client.Database(dbName))
	fmt.Println("Database collections initialized")

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
		AllowOrigins:     allowedOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Requested-With, X-CSRF-Token, X-API-Key",
		ExposeHeaders:    "Content-Length, Content-Range",
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check endpoint
	app.Get("/health", handlers.HealthCheck)
	app.Get("/api/health", handlers.HealthCheck)

	// Initialize WebSocket hub
	fmt.Println("Initializing WebSocket hub...")
	hub := handlers.NewHub()
	go hub.Run()
	fmt.Println("WebSocket hub initialized and running")

	// Middleware to inject hub into context
	hubMiddleware := func(c *fiber.Ctx) error {
		c.Locals("hub", hub)
		return c.Next()
	}

	// WebSocket endpoint
	app.Use("/ws", func(c *fiber.Ctx) error {
		fmt.Printf("WebSocket upgrade request from %s\n", c.IP())
		if websocket.IsWebSocketUpgrade(c) {
			fmt.Printf("WebSocket upgrade accepted for %s\n", c.IP())
			c.Locals("hub", hub) // Add hub to context
			c.Locals("allowed", true)
			return c.Next()
		}
		fmt.Printf("WebSocket upgrade rejected for %s\n", c.IP())
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		fmt.Printf("New WebSocket connection established with %s\n", c.RemoteAddr().String())
		handlers.ServeWs(hub, c)
	}))

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

	// Student results routes
	adminApi.Get("/student-results", handlers.GetAllStudentResults)
	adminApi.Get("/student-results/:studentId", handlers.GetStudentResultsByStudent)
	adminApi.Get("/student-results/challenge/:challengeId", handlers.GetStudentResultsByChallenge)

	// Test results routes
	adminApi.Get("/test-results", handlers.GetTestResults)
	adminApi.Get("/test-results/student/:studentId", handlers.GetTestResultsByStudent)
	adminApi.Get("/test-results/test/:testId", handlers.GetTestResultsByTest)

	// Admin data routes
	adminApi.Get("/students", handlers.GetStudents)
	adminApi.Get("/challenges", handlers.GetChallenges)
	adminApi.Get("/tests", handlers.GetTests)

	// Questions routes
	questions := api.Group("/questions")
	questions.Post("/", handlers.CreateQuestion)
	questions.Get("/", handlers.GetQuestions)
	questions.Get("/:id", handlers.GetQuestion)
	questions.Put("/:id", handlers.UpdateQuestion)
	questions.Delete("/:id", handlers.DeleteQuestion)

	// Test routes - add hub middleware
	tests := api.Group("/tests")
	tests.Use(hubMiddleware) // Add hub to context for all test routes

	// Specific routes first
	tests.Get("/active", func(c *fiber.Ctx) error {
		fmt.Printf("Handling /active request\n")
		return handlers.GetActiveTests(c)
	})
	tests.Get("/scheduled", func(c *fiber.Ctx) error {
		fmt.Printf("Handling /scheduled request\n")
		return handlers.GetScheduledTests(c)
	})
	tests.Get("/attempts/:attemptId", handlers.GetTestAttempt)

	// Generic routes last
	tests.Get("/", handlers.GetTests)
	tests.Get("/:id", handlers.GetTest)
	tests.Post("/", handlers.CreateTest)
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

	// Log configuration
	fmt.Println("==========================================")
	fmt.Printf("Environment: %s\n", getEnvWithDefault("GO_ENV", "development"))
	fmt.Printf("Log Level: %s\n", logLevel)
	fmt.Printf("Server starting on port %s...\n", port)
	fmt.Printf("API endpoints available at http://localhost:%s/api\n", port)
	fmt.Printf("Health check available at http://localhost:%s/health\n", port)
	fmt.Printf("WebSocket endpoint available at ws://localhost:%s/ws\n", port)
	fmt.Printf("CORS allowed origins: %s\n", allowedOrigins)
	fmt.Println("==========================================")

	// Start server with graceful shutdown
	if err := app.Listen(":" + port); err != nil {
		fmt.Printf("Failed to start server: %v\n", err)
		log.Fatal("Failed to start server:", err)
	}
}
