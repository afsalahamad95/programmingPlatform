package handlers

import (
	"context"
	"log"
	"math"
	"net/http"
	"qms-backend/db"
	"qms-backend/presenter"
	"sort"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// GetTestResultsAnalytics returns comprehensive aggregated analytics for all test results.
// Includes: overall stats, score distribution, per-test breakdown, per-student breakdown,
// time series, engagement metrics, question difficulty, and leaderboard.
func GetTestResultsAnalytics(c *fiber.Ctx) error {
	cacheKey := CacheKey("test_results", "analytics_v2")

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

	totalAttempts := len(attempts)
	totalScoreSum := 0.0
	totalTimeSum := 0
	passCount := 0
	failCount := 0
	submittedCount := 0

	// Score distribution buckets: 0-10, 10-20, ..., 90-100
	scoreBuckets := make([]int, 10)

	// Per-test breakdown
	type testStat struct {
		Title     string  `json:"title"`
		Attempts  int     `json:"attempts"`
		AvgScore  float64 `json:"avgScore"`
		PassRate  float64 `json:"passRate"`
		AvgTime   float64 `json:"avgTime"` // seconds
		scoreSum  float64
		passCount int
		timeSum   int
	}
	testStats := map[string]*testStat{}

	// Per-student breakdown
	type studentStat struct {
		Name      string  `json:"name"`
		Email     string  `json:"email"`
		Attempts  int     `json:"attempts"`
		AvgScore  float64 `json:"avgScore"`
		BestScore float64 `json:"bestScore"`
		AvgTime   float64 `json:"avgTime"`
		scoreSum  float64
		bestScore float64
		timeSum   int
	}
	studentStats := map[string]*studentStat{}

	// Daily time-series
	type dailyStat struct {
		Date     string  `json:"date"`
		Attempts int     `json:"attempts"`
		AvgScore float64 `json:"avgScore"`
		scoreSum float64
	}
	dailyMap := map[string]*dailyStat{}

	// Weekly time-series
	type weeklyStat struct {
		Week     string  `json:"week"`
		Attempts int     `json:"attempts"`
		AvgScore float64 `json:"avgScore"`
		scoreSum float64
	}
	weeklyMap := map[string]*weeklyStat{}

	// Per-question difficulty tracking
	type questionStat struct {
		QuestionID string  `json:"questionId"`
		Total      int     `json:"total"`
		Correct    int     `json:"correct"`
		Difficulty float64 `json:"difficulty"` // 0-1, lower = harder
	}
	questionStats := map[string]*questionStat{}

	// Question type distribution
	questionTypeCounts := map[string]int{"mcq": 0, "code": 0, "subjective": 0}

	// Hourly activity heatmap (0-23)
	hourlyActivity := make([]int, 24)

	// Attempt score history (for sparklines)
	type attemptPoint struct {
		Date  string  `json:"date"`
		Score float64 `json:"score"`
	}

	for _, attempt := range attempts {
		// --- Resolve test & compute score ---
		var test presenter.TestData
		testTitle := "Unknown/Deleted Test"
		testID, err := primitive.ObjectIDFromHex(attempt.TestID)
		if err == nil {
			_ = db.TestsCollection.FindOne(context.Background(), bson.M{"_id": testID}).Decode(&test)
			if test.Title != "" {
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

			// Question type distribution
			if question.Type != "" {
				questionTypeCounts[question.Type]++
			}

			// Per-question difficulty
			qid := answer.QuestionID
			if _, ok := questionStats[qid]; !ok {
				questionStats[qid] = &questionStat{QuestionID: qid}
			}
			questionStats[qid].Total++

			isCorrect := false
			if question.Type == "mcq" {
				selectedIndex, err := strconv.ParseInt(answer.Answer, 10, 64)
				if err == nil && int(selectedIndex) == question.CorrectOption {
					scoredPoints += question.Points
					isCorrect = true
				}
			}
			if isCorrect {
				questionStats[qid].Correct++
			}
		}

		pct := 0.0
		if totalPoints > 0 {
			pct = float64(scoredPoints) / float64(totalPoints) * 100
		}

		totalScoreSum += pct
		totalTimeSum += attempt.TimeSpent

		if pct >= 70 {
			passCount++
		} else if totalPoints > 0 {
			failCount++
		} else {
			submittedCount++
		}

		bucket := int(pct / 10)
		if bucket >= 10 {
			bucket = 9
		}
		scoreBuckets[bucket]++

		// Hourly heatmap
		hourlyActivity[attempt.SubmittedAt.Hour()]++

		// --- Per-test stats ---
		if _, ok := testStats[attempt.TestID]; !ok {
			testStats[attempt.TestID] = &testStat{Title: testTitle}
		}
		ts := testStats[attempt.TestID]
		ts.Attempts++
		ts.scoreSum += pct
		ts.timeSum += attempt.TimeSpent
		if pct >= 70 {
			ts.passCount++
		}

		// --- Per-student stats ---
		if _, ok := studentStats[attempt.StudentID]; !ok {
			studentStats[attempt.StudentID] = &studentStat{
				Name:  attempt.StudentName,
				Email: attempt.StudentEmail,
			}
		}
		ss := studentStats[attempt.StudentID]
		ss.Attempts++
		ss.scoreSum += pct
		ss.timeSum += attempt.TimeSpent
		if pct > ss.bestScore {
			ss.bestScore = pct
		}

		// --- Daily aggregation ---
		dateKey := attempt.SubmittedAt.Format("2006-01-02")
		if _, ok := dailyMap[dateKey]; !ok {
			dailyMap[dateKey] = &dailyStat{Date: dateKey}
		}
		dm := dailyMap[dateKey]
		dm.Attempts++
		dm.scoreSum += pct

		// --- Weekly aggregation ---
		yr, wk := attempt.SubmittedAt.ISOWeek()
		weekKey := strconv.Itoa(yr) + "-W" + strconv.Itoa(wk)
		if _, ok := weeklyMap[weekKey]; !ok {
			weeklyMap[weekKey] = &weeklyStat{Week: weekKey}
		}
		wm := weeklyMap[weekKey]
		wm.Attempts++
		wm.scoreSum += pct
	}

	// --- Finalize aggregates ---
	avgScore := 0.0
	passRate := 0.0
	avgTimeSpent := 0.0
	if totalAttempts > 0 {
		avgScore = math.Round(totalScoreSum/float64(totalAttempts)*10) / 10
		passRate = math.Round(float64(passCount)/float64(totalAttempts)*1000) / 10
		avgTimeSpent = math.Round(float64(totalTimeSum)/float64(totalAttempts)*10) / 10
	}

	// Test breakdown (sorted by attempts desc)
	testBreakdown := make([]fiber.Map, 0, len(testStats))
	for id, ts := range testStats {
		avg := 0.0
		pr := 0.0
		avgT := 0.0
		if ts.Attempts > 0 {
			avg = math.Round(ts.scoreSum/float64(ts.Attempts)*10) / 10
			pr = math.Round(float64(ts.passCount)/float64(ts.Attempts)*1000) / 10
			avgT = math.Round(float64(ts.timeSum)/float64(ts.Attempts)*10) / 10
		}
		testBreakdown = append(testBreakdown, fiber.Map{
			"testId":   id,
			"title":    ts.Title,
			"attempts": ts.Attempts,
			"avgScore": avg,
			"passRate": pr,
			"avgTime":  avgT,
		})
	}
	sort.Slice(testBreakdown, func(i, j int) bool {
		return testBreakdown[i]["attempts"].(int) > testBreakdown[j]["attempts"].(int)
	})

	// Student breakdown + leaderboard
	studentBreakdown := make([]fiber.Map, 0, len(studentStats))
	for id, ss := range studentStats {
		avg := 0.0
		avgT := 0.0
		if ss.Attempts > 0 {
			avg = math.Round(ss.scoreSum/float64(ss.Attempts)*10) / 10
			avgT = math.Round(float64(ss.timeSum)/float64(ss.Attempts)*10) / 10
		}
		studentBreakdown = append(studentBreakdown, fiber.Map{
			"studentId": id,
			"name":      ss.Name,
			"email":     ss.Email,
			"attempts":  ss.Attempts,
			"avgScore":  avg,
			"bestScore": math.Round(ss.bestScore*10) / 10,
			"avgTime":   avgT,
		})
	}
	// Sort leaderboard by avgScore desc
	sort.Slice(studentBreakdown, func(i, j int) bool {
		return studentBreakdown[i]["avgScore"].(float64) > studentBreakdown[j]["avgScore"].(float64)
	})
	leaderboard := studentBreakdown
	if len(leaderboard) > 10 {
		leaderboard = leaderboard[:10]
	}

	// Daily time series (sorted by date asc)
	timeSeries := make([]fiber.Map, 0, len(dailyMap))
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
	sort.Slice(timeSeries, func(i, j int) bool {
		return timeSeries[i]["date"].(string) < timeSeries[j]["date"].(string)
	})

	// Weekly time series (sorted by week asc)
	weeklyTimeSeries := make([]fiber.Map, 0, len(weeklyMap))
	for _, wm := range weeklyMap {
		avg := 0.0
		if wm.Attempts > 0 {
			avg = math.Round(wm.scoreSum/float64(wm.Attempts)*10) / 10
		}
		weeklyTimeSeries = append(weeklyTimeSeries, fiber.Map{
			"week":     wm.Week,
			"attempts": wm.Attempts,
			"avgScore": avg,
		})
	}
	sort.Slice(weeklyTimeSeries, func(i, j int) bool {
		return weeklyTimeSeries[i]["week"].(string) < weeklyTimeSeries[j]["week"].(string)
	})

	// Score distribution
	scoreDistribution := make([]fiber.Map, 10)
	for i := range 10 {
		scoreDistribution[i] = fiber.Map{
			"range": strconv.Itoa(i*10) + "-" + strconv.Itoa((i+1)*10),
			"count": scoreBuckets[i],
		}
	}

	// Question difficulty (sorted by difficulty asc — hardest first)
	questionDifficulty := make([]fiber.Map, 0, len(questionStats))
	for _, qs := range questionStats {
		diff := 0.0
		if qs.Total > 0 {
			diff = math.Round(float64(qs.Correct)/float64(qs.Total)*1000) / 1000
		}
		questionDifficulty = append(questionDifficulty, fiber.Map{
			"questionId": qs.QuestionID,
			"total":      qs.Total,
			"correct":    qs.Correct,
			"difficulty": diff,
		})
	}
	sort.Slice(questionDifficulty, func(i, j int) bool {
		return questionDifficulty[i]["difficulty"].(float64) < questionDifficulty[j]["difficulty"].(float64)
	})
	hardestQuestions := questionDifficulty
	if len(hardestQuestions) > 10 {
		hardestQuestions = hardestQuestions[:10]
	}

	// Hourly heatmap as array of {hour, count}
	hourlyHeatmap := make([]fiber.Map, 24)
	for h := range 24 {
		hourlyHeatmap[h] = fiber.Map{"hour": h, "count": hourlyActivity[h]}
	}

	// Question type distribution
	typeDistribution := []fiber.Map{
		{"type": "MCQ", "count": questionTypeCounts["mcq"]},
		{"type": "Coding", "count": questionTypeCounts["code"]},
		{"type": "Subjective", "count": questionTypeCounts["subjective"]},
	}

	analytics := fiber.Map{
		// Overview
		"totalAttempts":     totalAttempts,
		"avgScore":          avgScore,
		"passRate":          passRate,
		"passCount":         passCount,
		"failCount":         failCount,
		"submittedCount":    submittedCount,
		"avgTimeSpent":      avgTimeSpent,
		"uniqueStudents":    len(studentStats),
		"uniqueTests":       len(testStats),
		// Distributions
		"scoreDistribution":  scoreDistribution,
		"typeDistribution":   typeDistribution,
		"hourlyHeatmap":      hourlyHeatmap,
		// Time series
		"timeSeries":         timeSeries,
		"weeklyTimeSeries":   weeklyTimeSeries,
		// Breakdowns
		"testBreakdown":      testBreakdown,
		"studentBreakdown":   studentBreakdown,
		"leaderboard":        leaderboard,
		"hardestQuestions":   hardestQuestions,
		"generatedAt":        time.Now().Format(time.RFC3339),
	}

	CacheSet(c.Context(), cacheKey, analytics, 3*time.Minute)
	return c.JSON(analytics)
}
