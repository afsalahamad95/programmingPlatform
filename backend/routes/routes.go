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
	app.Get("/tests/attempts/:attemptId", handlers.GetTestAttempt)

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
}
