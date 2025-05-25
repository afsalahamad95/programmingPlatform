package handlers

import (
	"time"

	"qms-backend/services"

	"github.com/gofiber/fiber/v2"
)

func HealthCheck(c *fiber.Ctx) error {
	// Get real-time status for database
	dbStatus, dbErr := services.CheckDatabaseHealth()
	if dbErr != nil {
		dbStatus = "error: " + dbErr.Error()
	}

	// Get real-time status for API
	apiStatus, apiErr := services.CheckAPIHealth()
	if apiErr != nil {
		apiStatus = "error: " + apiErr.Error()
	}

	return c.JSON(fiber.Map{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.0",
		"services": fiber.Map{
			"database": dbStatus,
			"api":      apiStatus,
		},
	})
}
