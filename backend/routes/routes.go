package routes

import (
	"qms-backend/handlers"

	"github.com/gofiber/fiber/v2"
)

// SetupRoutes configures all the routes for the application
func SetupRoutes(app *fiber.App) {
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
}
