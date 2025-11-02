package presenter

type ExecuteRequest struct {
	Language  string          `json:"language"`
	Code      string          `json:"code"`
	Input     string          `json:"input"`
	Config    ExecutionConfig `json:"config"`
	TestCases []TestCase      `json:"test_cases"`
}
