package handlers

import (
	"context"
	"log"
	"math"
	"net/http"
	"qms-backend/db"
	"qms-backend/presenter"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetTestResultsAnalytics returns aggregated analytics for all test results.
// Designed to be consumed by AI tools (roadmap generator, etc.) and admin dashboards.
func GetTestResultsAnalytics(c *fiber.Ctx) error {
	cacheKey := CacheKey("test_results", "analytics")

	var cached fiber.Map
	if CacheGet(c.Context(), cacheKey, &cached) {
		return c.JSON(cached)
	}

	var attempts []presenter.TestSubmission
	cursor, err := db.AttemptCollection.Find(
		context.Background(),
		bson.M{},
		options.Find().SetSort(bson.D{{Key: "submittedAt", Value: -1}}),
	)
	if err != nil {
		log.Printf("Analytics: failed to fetch attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch test results"})
	}
	defer cursor.Close(context.Background())

	if err := cursor.All(context.Background(), &attempts); err != nil {
		log.Printf("Analytics: failed to decode attempts: %v", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decode test results"})
	}

	// Aggregation accumulators
	totalAttempts := len(attempts)
	totalScoreSum := 0.0
	passCount := 0
	failCount := 0
	submittedCount := 0

	// Score distribution buckets: 0-10, 10-20, ..., 90-100
	scoreBuckets := make([]int, 10)

	// Per-test breakdown
	testStats := map[string]*struct {
		Title        string  `json:"title"`
		Attempts     int     `json:"attempts"`
		AvgScore     float64 `json:"avgScore"`
		PassRate     float64 `json:"passRate"`
		scoreSum     float64
		passCount    int
	}{}

	// Per-student breakdown
	studentStats := map[string]*struct {
		Name      string  `json:"name"`
		Email     string  `json:"email"`
		Attempts  int     `json:"attempts"`
		AvgScore  float64 `json:"avgScore"`
		scoreSum  float64
	}{}

	// Time-series (daily aggregation)
	dailyMap := map[string]*struct {
		Date     string  `json:"date"`
		Attempts int     `json:"attempts"`
		AvgScore float64 `json:"avgScore"`
		scoreSum float64
	}{}

	for _, attempt := range attempts {
		// Compute score for this attempt
		var test presenter.TestData
		var testTitle = "Unknown/Deleted Test"
		testID, err := primitive.ObjectIDFromHex(attempt.TestID)
		if err == nil {
			err = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": testID}).Decode(&test)
			if err == nil {
				testTitle = test.Title
			}
		}

		totalPoints := 0
		scoredPoints := 0
		for _, answer := range attempt.Answers {
			var question presenter.Question
			questionID, err := primitive.ObjectIDFromHex(answer.QuestionID)
			if err != nil {
				continue
			}
			err = db.QuestionsCollection.FindOne(context.Background(), bson.M{"_id": questionID}).Decode(&question)
			if err != nil {
				continue
			}
			totalPoints += question.Points
			if question.Type == "mcq" {
				selectedIndex, err := strconv.ParseInt(answer.Answer, 10, 64)
				if err == nil && int(selectedIndex) == question.CorrectOption {
					scoredPoints += question.Points
				}
			}
		}

		pct := 0.0
		if totalPoints > 0 {
			pct = float64(scoredPoints) / float64(totalPoints) * 100
		}

		totalScoreSum += pct

		// Status counts
		if pct >= 70 {
			passCount++
		} else if pct > 0 {
			failCount++
		} else {
			submittedCount++
		}

		// Score distribution
		bucket := int(pct / 10)
		if bucket >= 10 {
			bucket = 9
		}
		scoreBuckets[bucket]++

		// Per-test stats
		if _, ok := testStats[attempt.TestID]; !ok {
			testStats[attempt.TestID] = &struct {
				Title     string  `json:"title"`
				Attempts  int     `json:"attempts"`
				AvgScore  float64 `json:"avgScore"`
				PassRate  float64 `json:"passRate"`
				scoreSum  float64
				passCount int
			}{Title: testTitle}
		}
		ts := testStats[attempt.TestID]
		ts.Attempts++
		ts.scoreSum += pct
		if pct >= 70 {
			ts.passCount++
		}

		// Per-student stats
		if _, ok := studentStats[attempt.StudentID]; !ok {
			studentStats[attempt.StudentID] = &struct {
				Name     string  `json:"name"`
				Email    string  `json:"email"`
				Attempts int     `json:"attempts"`
				AvgScore float64 `json:"avgScore"`
				scoreSum float64
			}{Name: attempt.StudentName, Email: attempt.StudentEmail}
		}
		ss := studentStats[attempt.StudentID]
		ss.Attempts++
		ss.scoreSum += pct

		// Daily aggregation
		dateKey := attempt.SubmittedAt.Format("2006-01-02")
		if _, ok := dailyMap[dateKey]; !ok {
			dailyMap[dateKey] = &struct {
				Date     string  `json:"date"`
				Attempts int     `json:"attempts"`
				AvgScore float64 `json:"avgScore"`
				scoreSum float64
			}{Date: dateKey}
		}
		dm := dailyMap[dateKey]
		dm.Attempts++
		dm.scoreSum += pct
	}

	// Finalize averages
	avgScore := 0.0
	passRate := 0.0
	if totalAttempts > 0 {
		avgScore = math.Round(totalScoreSum/float64(totalAttempts)*10) / 10
		passRate = math.Round(float64(passCount)/float64(totalAttempts)*1000) / 10
	}

	testBreakdown := make([]fiber.Map, 0)
	for id, ts := range testStats {
		avg := 0.0
		pr := 0.0
		if ts.Attempts > 0 {
			avg = math.Round(ts.scoreSum/float64(ts.Attempts)*10) / 10
			pr = math.Round(float64(ts.passCount)/float64(ts.Attempts)*1000) / 10
		}
		testBreakdown = append(testBreakdown, fiber.Map{
			"testId":   id,
			"title":    ts.Title,
			"attempts": ts.Attempts,
			"avgScore": avg,
			"passRate": pr,
		})
	}

	studentBreakdown := make([]fiber.Map, 0)
	for id, ss := range studentStats {
		avg := 0.0
		if ss.Attempts > 0 {
			avg = math.Round(ss.scoreSum/float64(ss.Attempts)*10) / 10
		}
		studentBreakdown = append(studentBreakdown, fiber.Map{
			"studentId": id,
			"name":      ss.Name,
			"email":     ss.Email,
			"attempts":  ss.Attempts,
			"avgScore":  avg,
		})
	}

	timeSeries := make([]fiber.Map, 0)
	for _, dm := range dailyMap {
		avg := 0.0
		if dm.Attempts > 0 {
			avg = math.Round(dm.scoreSum/float64(dm.Attempts)*10) / 10
		}
		timeSeries = append(timeSeries, fiber.Map{
			"date":     dm.Date,
			"attempts": dm.Attempts,
			"avgScore": avg,
		})
	}

	// Build score distribution
	scoreDistribution := make([]fiber.Map, 10)
	for i := 0; i < 10; i++ {
		scoreDistribution[i] = fiber.Map{
			"range": strconv.Itoa(i*10) + "-" + strconv.Itoa((i+1)*10),
			"count": scoreBuckets[i],
		}
	}

	analytics := fiber.Map{
		"totalAttempts":     totalAttempts,
		"avgScore":          avgScore,
		"passRate":          passRate,
		"passCount":         passCount,
		"failCount":         failCount,
		"submittedCount":    submittedCount,
		"scoreDistribution": scoreDistribution,
		"testBreakdown":     testBreakdown,
		"studentBreakdown":  studentBreakdown,
		"timeSeries":        timeSeries,
		"generatedAt":       time.Now().Format(time.RFC3339),
	}

	// Cache for 3 minutes — analytics are heavier to compute
	CacheSet(c.Context(), cacheKey, analytics, 3*time.Minute)

	return c.JSON(analytics)
}
