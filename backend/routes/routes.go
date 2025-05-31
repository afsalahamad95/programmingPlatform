package routes

import (
	"qms-backend/handlers"

	"github.com/gofiber/fiber/v2"
)

// SetupRoutes configures all the routes for the application
func SetupRoutes(app *fiber.App) {
	// Health check endpoints
	app.Get("/health", handlers.HealthCheck)
	app.Get("/api/health", handlers.HealthCheck)

	// API routes group
	api := app.Group("/api")

	// Auth routes
	api.Post("/auth/login", handlers.Login)
	api.Post("/auth/logout", handlers.Logout)
	api.Get("/auth/me", handlers.GetCurrentUser)

	// Test routes
	api.Get("/tests", handlers.GetTests)
	api.Get("/tests/:id", handlers.GetTest)
	api.Post("/tests", handlers.CreateTest)
	api.Put("/tests/:id", handlers.UpdateTest)
	api.Delete("/tests/:id", handlers.DeleteTest)
	api.Post("/tests/:id/submit", handlers.SubmitTest)
	api.Get("/tests/attempts/:attemptId", handlers.GetTestAttempt)

	// User routes
	api.Post("/users", handlers.CreateUser)
	api.Get("/users/:id", handlers.GetUser)
	api.Put("/users/:id", handlers.UpdateUser)
	api.Delete("/users/:id", handlers.DeleteUser)

	// Challenge routes
	challenges := api.Group("/challenges")
	challenges.Post("/", handlers.CreateChallenge)
	challenges.Get("/:id", handlers.GetChallenge)
	challenges.Put("/:id", handlers.UpdateChallenge)
	challenges.Delete("/:id", handlers.DeleteChallenge)
	challenges.Post("/:id/submit", handlers.SubmitChallengeAttempt)
	challenges.Get("/:id/attempts", handlers.GetChallengeAttempts)
	challenges.Get("/:id/attempts/:userId", handlers.GetUserChallengeAttempts)
	challenges.Get("/results", handlers.GetChallengeResults)
	challenges.Get("/results/student/:studentId", handlers.GetChallengeResultsByStudent)
	challenges.Get("/results/challenge/:challengeId", handlers.GetChallengeResultsByChallenge)

	// Admin routes
	admin := api.Group("/admin")

	// Test results routes
	admin.Get("/test-results", handlers.GetTestResults)
	admin.Get("/test-results/student/:studentId", handlers.GetTestResultsByStudent)
	admin.Get("/test-results/test/:testId", handlers.GetTestResultsByTest)

	// Student results routes
	admin.Get("/student-results", handlers.GetAllStudentResults)
	admin.Get("/student-results/:studentId", handlers.GetStudentResultsByStudent)
	admin.Get("/student-results/challenge/:challengeId", handlers.GetStudentResultsByChallenge)
}
