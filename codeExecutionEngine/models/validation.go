package models

type TestCase struct {
	Input           string  `json:"input"`
	ExpectedOutput  string  `json:"expected_output"`
	Description     string  `json:"description"`
	PointsAvailable float64 `json:"points_available,omitempty"` // Max points for this test case
}

type ValidationResult struct {
	Passed    bool               `json:"passed"`
	TestCases []Result           `json:"test_cases"`
	Summary   *ValidationSummary `json:"summary"`
}

type ValidationSummary struct {
	TotalTests      int     `json:"total_tests"`
	PassedTests     int     `json:"passed_tests"`
	FailedTests     int     `json:"failed_tests"`
	TotalPoints     float64 `json:"total_points"`     // Total points available across all tests
	ScoredPoints    float64 `json:"scored_points"`    // Points actually scored
	PercentageScore float64 `json:"percentage_score"` // Overall percentage score (0-100)
}

type Result struct {
	Input           string  `json:"input"`
	ExpectedOutput  string  `json:"expected_output"`
	ActualOutput    string  `json:"actual_output"`
	Passed          bool    `json:"passed"`
	Description     string  `json:"description"`
	Stderr          string  `json:"stderr,omitempty"`
	SimilarityScore float64 `json:"similarity_score"` // How closely output matches expected (0-1)
	PointsAvailable float64 `json:"points_available"` // Max points for this test case
	PointsScored    float64 `json:"points_scored"`    // Points awarded based on similarity
}
