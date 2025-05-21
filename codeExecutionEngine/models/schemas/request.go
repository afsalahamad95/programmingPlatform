package schemas

// ExecuteRequest represents the structure for code execution requests
type ExecuteRequest struct {
	Language  string          `json:"language"`
	Code      string          `json:"code"`
	Input     string          `json:"input"`
	Config    ExecutionConfig `json:"config"`
	TestCases []TestCase      `json:"test_cases,omitempty"`
}

// ExecutionConfig defines execution constraints
type ExecutionConfig struct {
	TimeoutSeconds int   `json:"timeout_seconds"`
	MemoryLimitMB  int64 `json:"memory_limit_mb"`
}

// TestCase defines a single test case structure
type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	Description    string `json:"description"`
}
