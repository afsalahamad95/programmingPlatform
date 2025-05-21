package models

type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	Description    string `json:"description"`
}

type ValidationResult struct {
	Passed    bool               `json:"passed"`
	TestCases []Result           `json:"test_cases"`
	Summary   *ValidationSummary `json:"summary"`
}

type ValidationSummary struct {
	TotalTests  int `json:"total_tests"`
	PassedTests int `json:"passed_tests"`
	FailedTests int `json:"failed_tests"`
}

type Result struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	ActualOutput   string `json:"actual_output"`
	Passed         bool   `json:"passed"`
	Description    string `json:"description"`
	Stderr         string `json:"stderr,omitempty"`
}
