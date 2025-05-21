package handlers

import (
	"context"
	"time"

	"qms-backend/db"
	"qms-backend/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// CreateUser creates a new user
func CreateUser(c *fiber.Ctx) error {
	user := new(models.User)
	if err := c.BodyParser(user); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()

	result, err := db.UsersCollection.InsertOne(context.Background(), user)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create user"})
	}

	user.ID = result.InsertedID.(primitive.ObjectID)
	return c.Status(201).JSON(user)
}

func GetUsers(c *fiber.Ctx) error {
	var users []models.User
	cursor, err := db.UsersCollection.Find(context.Background(), bson.M{})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch users"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &users); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to parse users"})
	}

	return c.JSON(users)
}

func GetUser(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID format"})
	}

	var user models.User
	err = db.UsersCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch user"})
	}

	return c.JSON(user)
}

func UpdateUser(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID format"})
	}

	updates := new(models.User)
	if err := c.BodyParser(updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	update := bson.M{
		"$set": updates,
	}

	result, err := db.UsersCollection.UpdateOne(context.Background(), bson.M{"_id": id}, update)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update user"})
	}

	if result.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	return c.SendStatus(200)
}

// DeleteUser deletes a user by ID
func DeleteUser(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID format"})
	}

	result, err := db.UsersCollection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete user"})
	}

	if result.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "User not found"})
	}

	return c.SendStatus(204)
}
