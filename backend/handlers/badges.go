package handlers

import (
	"context"
	"crypto/sha256"
	"fmt"
	"log"
	"net/http"
	"time"

	"qms-backend/db"
	"qms-backend/presenter"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetStudentBadges returns all badges earned by a student
func GetStudentBadges(c *fiber.Ctx) error {
	studentID := c.Params("studentId")
	if studentID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "studentId is required"})
	}

	cursor, err := db.BadgesCollection.Find(context.Background(), bson.M{"studentId": studentID})
	if err != nil {
		log.Printf("Failed to fetch badges for student %s: %v", studentID, err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch badges"})
	}
	defer cursor.Close(context.Background())

	var badges []presenter.Badge
	if err := cursor.All(context.Background(), &badges); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode badges"})
	}

	if badges == nil {
		badges = []presenter.Badge{}
	}
	return c.JSON(badges)
}

// GetAllBadgeDefinitions returns the full badge catalogue
func GetAllBadgeDefinitions(c *fiber.Ctx) error {
	return c.JSON(presenter.AllBadgeDefinitions)
}

// GetCertificate generates a certificate for a passing test attempt on demand.
// It computes the score from the raw attempt + question data.
func GetCertificate(c *fiber.Ctx) error {
	attemptID := c.Params("attemptId")
	objID, err := primitive.ObjectIDFromHex(attemptID)
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "Invalid attempt ID"})
	}

	var submission presenter.TestSubmission
	err = db.AttemptCollection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&submission)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "Attempt not found"})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch attempt"})
	}

	// Compute score on-demand
	pct, _, _ := computeAttemptScore(submission)

	if pct < 60 {
		return c.Status(http.StatusForbidden).JSON(fiber.Map{"error": "Certificate only available for passing scores (≥60%)"})
	}

	// Fetch test title
	testTitle := submission.TestID
	testObjID, err2 := primitive.ObjectIDFromHex(submission.TestID)
	if err2 == nil {
		var testData presenter.TestData
		if e := db.TestsCollection.FindOne(context.Background(), bson.M{"_id": testObjID}).Decode(&testData); e == nil {
			testTitle = testData.Title
		}
	}

	// Build deterministic cert ID from testId + studentId
	h := sha256.Sum256([]byte(submission.TestID + submission.StudentID))
	certID := fmt.Sprintf("CERT-%X", h[:6])

	var grade string
	switch {
	case pct >= 90:
		grade = "A"
	case pct >= 80:
		grade = "B"
	case pct >= 70:
		grade = "C"
	case pct >= 60:
		grade = "D"
	default:
		grade = "F"
	}

	cert := presenter.CertificateData{
		StudentName:  submission.StudentName,
		StudentEmail: submission.StudentEmail,
		TestTitle:    testTitle,
		Score:        pct,
		Grade:        grade,
		CompletedAt:  submission.SubmittedAt,
		CertID:       certID,
	}

	return c.JSON(cert)
}

// computeAttemptScore computes (percentageScore, pointsScored, totalPoints) for a submission.
func computeAttemptScore(attempt presenter.TestSubmission) (float64, int, int) {
	totalPoints := 0
	scoredPoints := 0
	for _, answer := range attempt.Answers {
		qObjID, err := primitive.ObjectIDFromHex(answer.QuestionID)
		if err != nil {
			continue
		}
		var q presenter.Question
		if err := db.QuestionsCollection.FindOne(context.Background(), bson.M{"_id": qObjID}).Decode(&q); err != nil {
			continue
		}
		totalPoints += q.Points
		if q.Type == "mcq" {
			var selectedIdx int
			if _, err := fmt.Sscanf(answer.Answer, "%d", &selectedIdx); err == nil && selectedIdx == q.CorrectOption {
				scoredPoints += q.Points
			}
		}
	}
	pct := 0.0
	if totalPoints > 0 {
		pct = float64(scoredPoints) / float64(totalPoints) * 100
	}
	return pct, scoredPoints, totalPoints
}

// AwardBadgesForAttempt evaluates all badge definitions and awards new ones.
// percentageScore: the score for this attempt (0-100)
// timeSpentSec:    time taken for this attempt in seconds
// totalCompleted:  total number of test attempts (including this one) the student has made
func AwardBadgesForAttempt(
	studentID, testID, testTitle string,
	percentageScore float64,
	timeSpentSec int,
	totalCompleted int,
) {
	ctx := context.Background()

	// ── Count consecutive passes by scanning attempt scores from newest first ──
	cursor, err := db.AttemptCollection.Find(ctx, bson.M{"studentId": studentID})
	if err != nil {
		log.Printf("Badge award: failed to query attempts: %v", err)
		return
	}
	defer cursor.Close(ctx)

	var allAttempts []presenter.TestSubmission
	if err := cursor.All(ctx, &allAttempts); err != nil {
		log.Printf("Badge award: failed to decode attempts: %v", err)
		return
	}

	// Compute pass streak and avg score from raw attempts
	passStreak := 0
	totalScore := 0.0
	for _, a := range allAttempts {
		pct, _, _ := computeAttemptScore(a)
		totalScore += pct
		if pct >= 60 {
			passStreak++
		} else {
			passStreak = 0 // streak resets on fail
		}
	}
	avgScore := 0.0
	if len(allAttempts) > 0 {
		avgScore = totalScore / float64(len(allAttempts))
	}

	// ── Fetch already-earned badge IDs ─────────────────────────────────────────
	existingCursor, err := db.BadgesCollection.Find(ctx, bson.M{"studentId": studentID})
	if err != nil {
		log.Printf("Badge award: failed to fetch existing badges: %v", err)
		return
	}
	defer existingCursor.Close(ctx)

	earnedIDs := map[string]bool{}
	var existingBadges []presenter.Badge
	if err2 := existingCursor.All(ctx, &existingBadges); err2 == nil {
		for _, b := range existingBadges {
			earnedIDs[b.BadgeID] = true
		}
	}

	timeSpentMin := timeSpentSec / 60

	// ── Evaluate each definition ───────────────────────────────────────────────
	for _, def := range presenter.AllBadgeDefinitions {
		if earnedIDs[def.ID] {
			continue
		}

		cr := def.Criteria
		earned := false

		switch def.Category {
		case presenter.CategoryMilestone:
			earned = cr.MinTestsCompleted > 0 && totalCompleted >= cr.MinTestsCompleted

		case presenter.CategoryPerformance:
			earned = cr.MinScore > 0 && percentageScore >= cr.MinScore

		case presenter.CategoryConsistency:
			if cr.PassStreak > 0 {
				earned = passStreak >= cr.PassStreak
			} else if cr.MinAvgScore > 0 {
				minTests := cr.MinTestsCompleted
				if minTests == 0 {
					minTests = 1
				}
				earned = avgScore >= cr.MinAvgScore && totalCompleted >= minTests
			}

		case presenter.CategorySpeed:
			earned = cr.MaxTimeMinutes > 0 && timeSpentMin > 0 &&
				timeSpentMin <= cr.MaxTimeMinutes &&
				percentageScore >= cr.MinScore
		}

		if !earned {
			continue
		}

		badge := presenter.Badge{
			StudentID:   studentID,
			BadgeID:     def.ID,
			Name:        def.Name,
			Description: def.Description,
			Icon:        def.Icon,
			Tier:        def.Tier,
			Category:    def.Category,
			EarnedAt:    time.Now(),
			TestID:      testID,
			TestTitle:   testTitle,
			Score:       percentageScore,
		}

		_, insertErr := db.BadgesCollection.InsertOne(ctx, badge)
		if insertErr != nil {
			log.Printf("Badge award: failed to insert badge '%s' for student %s: %v", def.ID, studentID, insertErr)
		} else {
			log.Printf("Badge award: awarded '%s' (%s) to student %s", def.Name, def.Tier, studentID)
		}
	}
}
