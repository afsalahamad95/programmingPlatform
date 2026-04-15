package handlers

import (
	"context"
	"math"
	"net/http"
	"sort"
	"time"

	"qms-backend/db"
	"qms-backend/presenter"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// studentAttemptStats holds pre-computed stats from a user's attempt history.
type studentAttemptStats struct {
	total       int
	passed      int
	scores      []float64
	avgScore    float64
	dailyStreak int
	points      int
}

// computeStudentStats fetches all attempts for a student and computes aggregate stats.
func computeStudentStats(studentID string) studentAttemptStats {
	cursor, err := db.AttemptCollection.Find(
		context.Background(),
		bson.M{"studentId": studentID},
	)
	if err != nil {
		return studentAttemptStats{}
	}
	defer cursor.Close(context.Background())

	var attempts []presenter.TestSubmission
	if err := cursor.All(context.Background(), &attempts); err != nil {
		return studentAttemptStats{}
	}

	if len(attempts) == 0 {
		return studentAttemptStats{}
	}

	// Sort attempts newest-first for streak calculation.
	sort.Slice(attempts, func(i, j int) bool {
		return attempts[i].SubmittedAt.After(attempts[j].SubmittedAt)
	})

	var scores []float64
	passed := 0
	points := 0

	for _, a := range attempts {
		pct, _, _ := computeAttemptScore(a)
		scores = append(scores, pct)
		if pct >= 60 {
			passed++
			points += 100
		} else {
			points += 30
		}
		// Bonus points for high scores
		if pct >= 90 {
			points += 50
		} else if pct >= 80 {
			points += 20
		}
	}

	// Average score
	sum := 0.0
	for _, s := range scores {
		sum += s
	}
	avg := sum / float64(len(scores))

	// Daily streak: count consecutive calendar days (from today) that have >= 1 attempt.
	streak := 0
	now := time.Now().Truncate(24 * time.Hour)
	daySet := map[time.Time]bool{}
	for _, a := range attempts {
		daySet[a.SubmittedAt.Truncate(24*time.Hour)] = true
	}
	for {
		if !daySet[now] {
			break
		}
		streak++
		now = now.Add(-24 * time.Hour)
	}

	return studentAttemptStats{
		total:       len(attempts),
		passed:      passed,
		scores:      scores,
		avgScore:    avg,
		dailyStreak: streak,
		points:      points,
	}
}

// GetStudents retrieves all students
func GetStudents(c *fiber.Ctx) error {
	var students []presenter.Student

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

// GetStudent retrieves a student by ID.
// It first checks the students collection; if not found it falls back to the
// users collection and synthesises an analytics response from test attempts.
func GetStudent(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
			"error":   err.Error(),
		})
	}

	// Try the dedicated students collection first (admin-managed profiles).
	var student presenter.Student
	err = db.StudentsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&student)
	if err == nil {
		stats := computeStudentStats(id.Hex())
		return c.Status(http.StatusOK).JSON(buildAnalyticsResponse(student, stats))
	}
	if err != mongo.ErrNoDocuments {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch student",
			"error":   err.Error(),
		})
	}

	// Fall back: look up in users collection (all registered users live here).
	var user presenter.AuthUser
	if err := db.UsersCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&user); err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "User not found",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch user",
			"error":   err.Error(),
		})
	}

	stats := computeStudentStats(id.Hex())

	// Build a Student-compatible profile from the auth user.
	synth := presenter.Student{
		ID: user.ID,
		BasicInfo: presenter.BasicInfo{
			Name:   user.FirstName + " " + user.LastName,
			Email:  user.Email,
			Points: stats.points,
		},
	}

	return c.Status(http.StatusOK).JSON(buildAnalyticsResponse(synth, stats))
}

// buildAnalyticsResponse assembles the JSON shape the Dashboard expects.
func buildAnalyticsResponse(student presenter.Student, stats studentAttemptStats) fiber.Map {
	// Ensure points in basicInfo reflects computed points.
	if stats.points > 0 {
		student.BasicInfo.Points = stats.points
	}

	// Skill progression: proxy three dimensions from score data.
	avgScore := math.Round(stats.avgScore)

	recentAvg := avgScore
	if len(stats.scores) >= 3 {
		s := 0.0
		for _, v := range stats.scores[:3] {
			s += v
		}
		recentAvg = math.Round(s / 3)
	}

	passRate := 0.0
	if stats.total > 0 {
		passRate = math.Round(float64(stats.passed) / float64(stats.total) * 100)
	}

	skillProgression := fiber.Map{
		"Logic":           int(avgScore),
		"Algorithms":      int(recentAvg),
		"Problem Solving": int(passRate),
	}

	return fiber.Map{
		"id":        student.ID,
		"basicInfo": student.BasicInfo,
		"analytics": fiber.Map{
			"totalTests":       stats.total,
			"dailyStreak":      stats.dailyStreak,
			"skillProgression": skillProgression,
		},
	}
}

// GetStudentMilestones returns a predictive milestone projection for the student.
func GetStudentMilestones(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
		})
	}

	// Get user's target role for the milestone name.
	var user presenter.AuthUser
	milestoneName := "Senior Engineer"
	if err := db.UsersCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&user); err == nil {
		if user.TargetRole != "" {
			milestoneName = user.TargetRole
		}
	}

	stats := computeStudentStats(id.Hex())

	// Heuristic: reaching the goal requires ~50 tests at a good pass rate.
	const goalTests = 50
	remaining := goalTests - stats.total
	if remaining < 0 {
		remaining = 0
	}

	// Assume ~1 test every 2 days on average.
	daysRemaining := remaining * 2
	if stats.dailyStreak > 3 {
		daysRemaining = int(math.Round(float64(daysRemaining) * 0.7))
	}

	// Probability of success: weighted combination of pass rate and consistency.
	passRate := 0.0
	if stats.total > 0 {
		passRate = float64(stats.passed) / float64(stats.total) * 100
	}
	consistencyBonus := math.Min(float64(stats.dailyStreak)*2, 20)
	probabilityOfSuccess := math.Min(math.Round(passRate*0.8+consistencyBonus), 99)
	if stats.total == 0 {
		probabilityOfSuccess = 65 // encouraging default
	}

	// Next big skill: whichever proxy dimension is lowest.
	avgScore := stats.avgScore
	recentAvg := avgScore
	if len(stats.scores) >= 3 {
		s := 0.0
		for _, v := range stats.scores[:3] {
			s += v
		}
		recentAvg = s / 3
	}
	nextSkill := "Advanced Systems Design"
	if avgScore < recentAvg && avgScore < passRate {
		nextSkill = "Core Algorithm Mastery"
	} else if recentAvg < passRate {
		nextSkill = "Consistent Problem Solving"
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"daysRemaining":       daysRemaining,
		"milestoneName":       milestoneName,
		"probabilityOfSuccess": int(probabilityOfSuccess),
		"nextBigSkill":        nextSkill,
		"totalTests":          stats.total,
	})
}

// GetStudentInsights returns a concise AI-style insight card for the student.
func GetStudentInsights(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid ID format",
		})
	}

	stats := computeStudentStats(id.Hex())

	// Derive an insight message and priority skill from performance data.
	insight := "Start your first test to unlock personalised coaching insights."
	prioritySkill := "General Mastery"

	if stats.total > 0 {
		passRate := float64(stats.passed) / float64(stats.total) * 100

		// Recent trend: compare last 3 vs previous 3 scores.
		improving := false
		if len(stats.scores) >= 6 {
			recent, prev := 0.0, 0.0
			for _, s := range stats.scores[:3] {
				recent += s
			}
			for _, s := range stats.scores[3:6] {
				prev += s
			}
			improving = recent > prev
		}

		switch {
		case stats.dailyStreak >= 5:
			insight = "Excellent consistency! Your daily practice is accelerating skill acquisition. Push into harder problems to maximise growth."
			prioritySkill = "Advanced Topics"
		case improving:
			insight = "Strong upward trend detected. Your recent sessions show clear improvement — keep pushing past your comfort zone."
			prioritySkill = "Momentum Maintenance"
		case passRate < 50:
			insight = "Focus on fundamentals before attempting advanced problems. Review incorrect answers carefully — patterns in mistakes reveal the fastest path forward."
			prioritySkill = "Fundamentals"
		case passRate < 75:
			insight = "You're passing most tests, but there's clear room to reach mastery. Targeted practice on weak areas will break through this plateau."
			prioritySkill = "Targeted Practice"
		default:
			insight = "Solid performance across the board. To reach the next level, tackle timed challenges and focus on edge-case reasoning."
			prioritySkill = "Edge Case Mastery"
		}
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"insight":       insight,
		"prioritySkill": prioritySkill,
		"streak":        stats.dailyStreak,
	})
}

// CreateStudent creates a new student
func CreateStudent(c *fiber.Ctx) error {
	student := new(presenter.Student)
	if err := c.BodyParser(student); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}

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

	var existingStudent presenter.Student
	err = db.StudentsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&existingStudent)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"success": false,
				"message": "Student not found",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch student",
			"error":   err.Error(),
		})
	}

	updates := new(map[string]interface{})
	if err := c.BodyParser(updates); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
			"error":   err.Error(),
		})
	}
	(*updates)["updatedAt"] = time.Now()

	result, err := db.StudentsCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": id},
		bson.M{"$set": updates},
	)
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
		})
	}

	var updatedStudent presenter.Student
	db.StudentsCollection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&updatedStudent)
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
		})
	}

	return c.Status(http.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Student deleted successfully",
	})
}
