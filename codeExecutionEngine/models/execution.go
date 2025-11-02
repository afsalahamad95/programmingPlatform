package presenter

type CodeExecution struct {
	ID         string            `json:"id"`
	Language   string            `json:"language"`
	Code       string            `json:"code"`
	Input      string            `json:"input"`
	Status     ExecutionStatus   `json:"status"`
	Result     *ExecutionResult  `json:"result,omitempty"`
	Config     ExecutionConfig   `json:"config"`
	TestCases  []TestCase        `json:"test_cases,omitempty"`
	Validation *ValidationResult `json:"validation,omitempty"`
}

type ExecutionStatus string

const (
	StatusPending   ExecutionStatus = "pending"
	StatusRunning   ExecutionStatus = "running"
	StatusCompleted ExecutionStatus = "completed"
	StatusError     ExecutionStatus = "error"
)

type ExecutionResult struct {
	Stdout        string  `json:"stdout"`
	Stderr        string  `json:"stderr"`
	ExitCode      int     `json:"exit_code"`
	ExecutionTime float64 `json:"execution_time"`
	MemoryUsage   int64   `json:"memory_usage"`
}

type ExecutionConfig struct {
	TimeoutSeconds int   `json:"timeout_seconds"`
	MemoryLimitMB  int64 `json:"memory_limit_mb"`
}
