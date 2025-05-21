package schemas

// ExecuteResponse represents the structure for code execution responses
type ExecuteResponse struct {
	ID         string            `json:"id"`
	Language   string            `json:"language"`
	Code       string            `json:"code"`
	Input      string            `json:"input"`
	Status     string            `json:"status"`
	Result     *ExecutionResult  `json:"result,omitempty"`
	Validation *ValidationResult `json:"validation,omitempty"`
}

// ExecutionResult contains the output of code execution
type ExecutionResult struct {
	Stdout        string  `json:"stdout"`
	Stderr        string  `json:"stderr"`
	ExitCode      int     `json:"exit_code"`
	ExecutionTime float64 `json:"execution_time"`
	MemoryUsage   int64   `json:"memory_usage"`
}

// ValidationResult contains test case validation results
type ValidationResult struct {
	Passed    bool     `json:"passed"`
	TestCases []Result `json:"test_cases"`
	Summary   Summary  `json:"summary"`
}

// Result represents the outcome of a single test case
type Result struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	ActualOutput   string `json:"actual_output"`
	Passed         bool   `json:"passed"`
	Description    string `json:"description"`
}

// Summary provides an overview of test case results
type Summary struct {
	TotalTests  int `json:"total_tests"`
	PassedTests int `json:"passed_tests"`
	FailedTests int `json:"failed_tests"`
}
