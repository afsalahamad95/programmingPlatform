package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"qms-backend/models"
	"time"
)

type CodeExecutionService struct {
	baseURL string
	client  *http.Client
}

type ExecutionRequest struct {
	Language  string              `json:"language"`
	Code      string              `json:"code"`
	Input     string              `json:"input"`
	Config    ExecutionConfig     `json:"config"`
	TestCases []ExecutionTestCase `json:"test_cases"`
}

type ExecutionConfig struct {
	TimeoutSeconds int   `json:"timeout_seconds"`
	MemoryLimitMB  int64 `json:"memory_limit_mb"`
}

type ExecutionTestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	Description    string `json:"description"`
}

type ExecutionResponse struct {
	ID         string            `json:"id"`
	Status     string            `json:"status"`
	Result     *ExecutionResult  `json:"result,omitempty"`
	Validation *ValidationResult `json:"validation,omitempty"`
}

type ExecutionResult struct {
	Stdout        string  `json:"stdout"`
	Stderr        string  `json:"stderr"`
	ExitCode      int     `json:"exit_code"`
	ExecutionTime float64 `json:"execution_time"`
	MemoryUsage   int64   `json:"memory_usage"`
}

type ValidationResult struct {
	Passed    bool               `json:"passed"`
	TestCases []TestResult       `json:"test_cases"`
	Summary   *ValidationSummary `json:"summary"`
}

type ValidationSummary struct {
	TotalTests  int `json:"total_tests"`
	PassedTests int `json:"passed_tests"`
	FailedTests int `json:"failed_tests"`
}

type TestResult struct {
	Passed         bool   `json:"passed"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
	ActualOutput   string `json:"actual_output"`
	Description    string `json:"description"`
	Stderr         string `json:"stderr,omitempty"`
}

func NewCodeExecutionService() *CodeExecutionService {
	baseURL := os.Getenv("CODE_EXECUTOR_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080" // Default URL for code execution engine
	}

	return &CodeExecutionService{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (s *CodeExecutionService) ExecuteCode(challenge *models.CodingChallenge, code string) (*models.ValidationResult, error) {
	// Prepare the test cases
	testCases := make([]ExecutionTestCase, 0, len(challenge.TestCases))
	for _, tc := range challenge.TestCases {
		testCases = append(testCases, ExecutionTestCase{
			Input:          tc.Input,
			ExpectedOutput: tc.ExpectedOutput,
			Description:    tc.Description,
		})
	}

	// Prepare the execution request
	executionRequest := ExecutionRequest{
		Language: challenge.Language,
		Code:     code,
		Input:    "",
		Config: ExecutionConfig{
			TimeoutSeconds: challenge.TimeoutSec,
			MemoryLimitMB:  int64(challenge.MemoryLimitMB),
		},
		TestCases: testCases,
	}

	// Convert request to JSON
	jsonData, err := json.Marshal(executionRequest)
	if err != nil {
		return nil, fmt.Errorf("error marshaling execution request: %w", err)
	}

	// Send request to code execution engine
	resp, err := s.client.Post(
		fmt.Sprintf("%s/execute", s.baseURL),
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("error sending execution request: %w", err)
	}
	defer resp.Body.Close()

	// Check for non-200 status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("code execution engine returned status code %d", resp.StatusCode)
	}

	// Parse the response
	var executionResponse ExecutionResponse
	if err := json.NewDecoder(resp.Body).Decode(&executionResponse); err != nil {
		return nil, fmt.Errorf("error parsing execution response: %w", err)
	}

	// Check if validation result is available
	if executionResponse.Validation == nil {
		return nil, errors.New("no validation result received from code execution engine")
	}

	// Map to our validation result format
	testResults := make([]models.TestResult, 0, len(executionResponse.Validation.TestCases))
	for i, tr := range executionResponse.Validation.TestCases {
		testResults = append(testResults, models.TestResult{
			Passed:         tr.Passed,
			Input:          tr.Input,
			ExpectedOutput: tr.ExpectedOutput,
			ActualOutput:   tr.ActualOutput,
			Description:    tr.Description,
			Hidden:         challenge.TestCases[i].Hidden,
			Stderr:         tr.Stderr,
		})
	}

	// Create the final validation result
	validationResult := &models.ValidationResult{
		Passed:      executionResponse.Validation.Passed,
		TestCases:   testResults,
		TotalTests:  executionResponse.Validation.Summary.TotalTests,
		PassedTests: executionResponse.Validation.Summary.PassedTests,
		FailedTests: executionResponse.Validation.Summary.FailedTests,
	}

	return validationResult, nil
}
