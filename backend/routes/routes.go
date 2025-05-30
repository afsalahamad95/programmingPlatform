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

	// Test attempt route (defined early to ensure it's registered)
	// app.Get("/tests/attempts/:attemptId", handlers.GetTestAttempt)

	// Auth routes
	app.Post("/auth/login", handlers.Login)
	app.Post("/auth/logout", handlers.Logout)
	app.Get("/auth/me", handlers.GetCurrentUser)

	// Test routes
	app.Get("/tests", handlers.GetTests)
	app.Get("/tests/:id", handlers.GetTest)
	app.Post("/tests/:id/submit", handlers.SubmitTest)

	// User routes
	app.Post("/users", handlers.CreateUser)
	app.Get("/users/:id", handlers.GetUser)
	app.Put("/users/:id", handlers.UpdateUser)

	// Tests routes
	tests := app.Group("/tests")
	tests.Put("/:id", handlers.UpdateTest)
	tests.Delete("/:id", handlers.DeleteTest)
	tests.Post("/:id/submit", handlers.SubmitTest)
	tests.Get("/attempts/:attemptId", handlers.GetTestAttempt)

	// Users routes
	users := app.Group("/users")
	users.Post("/", handlers.CreateUser)
	users.Get("/:id", handlers.GetUser)
	users.Put("/:id", handlers.UpdateUser)
	users.Delete("/:id", handlers.DeleteUser)

	// challenge routes
	challenges := app.Group("/challenges")
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
	admin := app.Group("/admin")

	// Test results routes
	admin.Get("/test-results", handlers.GetTestResults)
	admin.Get("/test-results/student/:studentId", handlers.GetTestResultsByStudent)
	admin.Get("/test-results/test/:testId", handlers.GetTestResultsByTest)

	// Student results routes
	admin.Get("/student-results", handlers.GetAllStudentResults)
	admin.Get("/student-results/:studentId", handlers.GetStudentResultsByStudent)
	admin.Get("/student-results/challenge/:challengeId", handlers.GetStudentResultsByChallenge)
}
