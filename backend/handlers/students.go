package handlers

import (
	"context"
	"net/http"
	"time"

	"qms-backend/db"
	"qms-backend/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetStudents retrieves all students
func GetStudents(c *fiber.Ctx) error {
	var students []models.Student

	cursor, err := db.StudentsCollection.Find(context.Background(), bson.M{})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch students",
			"error":   err.Error(),
		})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &students); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to parse students",
			"error":   err.Error(),
		})
	}

	return c.Status(http.StatusOK).JSON(students)
}

// GetStudent retrieves a student by ID
func GetStudent(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
			"error":   err.Error(),
		})
	}

	var student models.Student
	err = db.StudentsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&student)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Student not found",
				"error":   "No student found with the provided ID",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch student",
			"error":   err.Error(),
		})
	}

	return c.Status(http.StatusOK).JSON(student)
}

// CreateStudent creates a new student
func CreateStudent(c *fiber.Ctx) error {
	student := new(models.Student)
	if err := c.BodyParser(student); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	// Set timestamps
	student.CreatedAt = time.Now()
	student.UpdatedAt = time.Now()

	result, err := db.StudentsCollection.InsertOne(context.Background(), student)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create student",
			"error":   err.Error(),
		})
	}

	// Set the ID from the inserted result
	student.ID = result.InsertedID.(primitive.ObjectID)

	return c.Status(http.StatusCreated).JSON(student)
}

// UpdateStudent updates a student
func UpdateStudent(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
			"error":   err.Error(),
		})
	}

	// First fetch the existing student
	var existingStudent models.Student
	err = db.StudentsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&existingStudent)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Student not found",
				"error":   "No student found with the provided ID",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch student",
			"error":   err.Error(),
		})
	}

	// Parse the updates
	updates := new(map[string]interface{})
	if err := c.BodyParser(updates); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

	// Add updated time to the updates
	(*updates)["updatedAt"] = time.Now()

	// Perform update with $set operator
	update := bson.M{
		"$set": updates,
	}

	result, err := db.StudentsCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update student",
			"error":   err.Error(),
		})
	}

	if result.MatchedCount == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Student not found",
			"error":   "No student found with the provided ID",
		})
	}

	// Fetch the updated student
	var updatedStudent models.Student
	err = db.StudentsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&updatedStudent)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch updated student",
			"error":   err.Error(),
		})
	}

	return c.Status(http.StatusOK).JSON(updatedStudent)
}

// DeleteStudent deletes a student
func DeleteStudent(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
			"error":   err.Error(),
		})
	}

	result, err := db.StudentsCollection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to delete student",
			"error":   err.Error(),
		})
	}

	if result.DeletedCount == 0 {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"success": false,
			"message": "Student not found",
			"error":   "No student found with the provided ID",
		})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Student deleted successfully",
	})
}
