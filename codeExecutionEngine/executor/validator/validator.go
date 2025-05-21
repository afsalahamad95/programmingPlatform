package validator

import (
	"code-executor/models"
	"fmt"
	"math"
	"strings"
)

type CodeValidator struct{}

func NewCodeValidator() *CodeValidator {
	return &CodeValidator{}
}

// calculateSimilarity computes a similarity score between two strings
// Returns a value between 0 (completely different) and 1 (identical)
func calculateSimilarity(expected, actual string) float64 {
	// Trim spaces for fairer comparison
	expected = strings.TrimSpace(expected)
	actual = strings.TrimSpace(actual)

	// If either string is empty, handle specially
	if len(expected) == 0 && len(actual) == 0 {
		return 1.0 // Both empty = perfect match
	}
	if len(expected) == 0 || len(actual) == 0 {
		return 0.0 // One empty, one not = no match
	}

	// If they're identical after trimming
	if expected == actual {
		return 1.0
	}

	// Calculate Levenshtein distance (edit distance)
	distance := levenshteinDistance(expected, actual)
	maxLen := float64(max(len(expected), len(actual)))

	// Convert distance to similarity (1 - normalized distance)
	similarity := 1.0 - (float64(distance) / maxLen)

	// Apply a penalty for very different lengths
	lenRatio := float64(min(len(expected), len(actual))) / maxLen

	// Average the edit similarity with the length ratio for a final score
	finalScore := (similarity*0.7 + lenRatio*0.3)

	// Ensure we don't go below 0 or above 1
	return math.Max(0.0, math.Min(1.0, finalScore))
}

// levenshteinDistance calculates edit distance between two strings
func levenshteinDistance(s1, s2 string) int {
	// Initialize the matrix with dimensions (len(s1)+1) x (len(s2)+1)
	d := make([][]int, len(s1)+1)
	for i := range d {
		d[i] = make([]int, len(s2)+1)
	}

	// Initialize the first row and column
	for i := range d {
		d[i][0] = i
	}
	for j := range d[0] {
		d[0][j] = j
	}

	// Fill the matrix
	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 1
			if s1[i-1] == s2[j-1] {
				cost = 0
			}

			d[i][j] = min(
				d[i-1][j]+1,      // deletion
				d[i][j-1]+1,      // insertion
				d[i-1][j-1]+cost, // substitution
			)
		}
	}

	return d[len(s1)][len(s2)]
}

// Helper function for min/max
func min(a, b int, c ...int) int {
	result := a
	if b < result {
		result = b
	}

	for _, v := range c {
		if v < result {
			result = v
		}
	}

	return result
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (v *CodeValidator) Validate(result []*models.ExecutionResult, testCases []models.TestCase) *models.ValidationResult {
	validationResult := &models.ValidationResult{
		Passed:    true,
		TestCases: make([]models.Result, 0),
		Summary: &models.ValidationSummary{
			TotalTests:      len(testCases),
			PassedTests:     0,
			FailedTests:     0,
			TotalPoints:     0,
			ScoredPoints:    0,
			PercentageScore: 0,
		},
	}

	// Calculate total available points
	totalAvailablePoints := 0.0
	for _, tc := range testCases {
		// Default to 1 point per test if not specified
		pointsAvailable := tc.PointsAvailable
		if pointsAvailable <= 0 {
			pointsAvailable = 1.0
		}
		totalAvailablePoints += pointsAvailable
	}
	validationResult.Summary.TotalPoints = totalAvailablePoints

	for i, testCase := range testCases {
		// Use exact string comparison (no normalization)
		actualOutput := result[i].Stdout

		// If there's an error (stderr not empty), include it in the output
		if result[i].Stderr != "" {
			fmt.Printf("  Error detected in execution: %s\n", result[i].Stderr)
			actualOutput = "Error: " + result[i].Stderr
		}

		expectedOutput := testCase.ExpectedOutput

		// Log for debugging
		fmt.Printf("Comparing test case %d:\n", i)
		fmt.Printf("  Expected: '%s'\n", expectedOutput)
		fmt.Printf("  Actual: '%s'\n", actualOutput)

		// Detailed character by character comparison for debugging
		fmt.Println("  Character comparison:")
		fmt.Printf("  Expected length: %d, Actual length: %d\n", len(expectedOutput), len(actualOutput))

		// Trim spaces for comparison only (keep original values for display)
		trimmedExpected := strings.TrimSpace(expectedOutput)
		trimmedActual := strings.TrimSpace(actualOutput)

		// Check for exact match
		passed := trimmedExpected == trimmedActual

		// Calculate similarity score
		similarityScore := calculateSimilarity(expectedOutput, actualOutput)
		fmt.Printf("  Similarity score: %.2f\n", similarityScore)

		// Set test case points (default to 1 if not specified)
		pointsAvailable := testCase.PointsAvailable
		if pointsAvailable <= 0 {
			pointsAvailable = 1.0
		}

		// Calculate points scored based on similarity
		pointsScored := pointsAvailable * similarityScore

		// Only award full points for perfect matches, unless similarity is very high
		if passed {
			pointsScored = pointsAvailable
			similarityScore = 1.0
		} else if similarityScore >= 0.9 {
			// Award full points for 90%+ similarity as a grace margin
			pointsScored = pointsAvailable
		}

		// Round points to 2 decimal places for clean display
		pointsScored = math.Round(pointsScored*100) / 100

		// Add to total score
		validationResult.Summary.ScoredPoints += pointsScored

		// Print first mismatch for debugging
		mismatchFound := false
		if trimmedExpected != trimmedActual {
			minLen := len(trimmedExpected)
			if len(trimmedActual) < minLen {
				minLen = len(trimmedActual)
			}

			for j := 0; j < minLen; j++ {
				if trimmedExpected[j] != trimmedActual[j] {
					fmt.Printf("  First mismatch at position %d: expected '%v' (ASCII: %d), got '%v' (ASCII: %d)\n",
						j, string(trimmedExpected[j]), trimmedExpected[j], string(trimmedActual[j]), trimmedActual[j])
					mismatchFound = true
					break
				}
			}

			// If no mismatch found in the common part, it's a length issue
			if !mismatchFound {
				if len(trimmedExpected) > len(trimmedActual) {
					fmt.Printf("  Output too short. Missing: '%s'\n", trimmedExpected[minLen:])
				} else {
					fmt.Printf("  Output too long. Extra: '%s'\n", trimmedActual[minLen:])
				}
			}
		}

		if passed {
			validationResult.Summary.PassedTests++
		} else {
			validationResult.Summary.FailedTests++
			validationResult.Passed = false
		}

		validationResult.TestCases = append(validationResult.TestCases, models.Result{
			Input:           testCase.Input,
			ExpectedOutput:  testCase.ExpectedOutput,
			ActualOutput:    result[i].Stdout,
			Passed:          passed,
			Description:     testCase.Description,
			Stderr:          result[i].Stderr,
			SimilarityScore: similarityScore,
			PointsAvailable: pointsAvailable,
			PointsScored:    pointsScored,
		})
	}

	// Calculate overall percentage score
	if validationResult.Summary.TotalPoints > 0 {
		percentage := (validationResult.Summary.ScoredPoints / validationResult.Summary.TotalPoints) * 100
		validationResult.Summary.PercentageScore = math.Round(percentage*10) / 10
	}

	return validationResult
}
