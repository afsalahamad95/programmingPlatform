package validator

import (
	"code-executor/models"
	"fmt"
	"strings"
)

type CodeValidator struct{}

func NewCodeValidator() *CodeValidator {
	return &CodeValidator{}
}

// normalizeOutput standardizes output for comparison by:
// - Trimming leading/trailing spaces
// - Removing any trailing newlines
// - Converting multiple whitespace to single space
func normalizeOutput(output string) string {
	// Trim spaces and remove trailing newlines
	output = strings.TrimSpace(output)

	// Remove carriage returns (Windows line endings)
	output = strings.ReplaceAll(output, "\r", "")

	// Replace multiple whitespace with single space
	output = strings.Join(strings.Fields(output), " ")

	return output
}

func (v *CodeValidator) Validate(result []*models.ExecutionResult, testCases []models.TestCase) *models.ValidationResult {
	validationResult := &models.ValidationResult{
		Passed:    true,
		TestCases: make([]models.Result, 0),
		Summary: &models.ValidationSummary{
			TotalTests:  len(testCases),
			PassedTests: 0,
			FailedTests: 0,
		},
	}

	for i, testCase := range testCases {
		// Normalize outputs for comparison
		actualOutput := normalizeOutput(result[i].Stdout)
		expectedOutput := normalizeOutput(testCase.ExpectedOutput)

		// Log for debugging
		fmt.Printf("Comparing test case %d:\n", i)
		fmt.Printf("  Expected (normalized): '%s'\n", expectedOutput)
		fmt.Printf("  Actual (normalized): '%s'\n", actualOutput)

		passed := actualOutput == expectedOutput

		if passed {
			validationResult.Summary.PassedTests++
		} else {
			validationResult.Summary.FailedTests++
			validationResult.Passed = false
		}

		validationResult.TestCases = append(validationResult.TestCases, models.Result{
			Input:          testCase.Input,
			ExpectedOutput: testCase.ExpectedOutput,
			ActualOutput:   result[i].Stdout, // Keep original output for display
			Passed:         passed,
			Description:    testCase.Description,
		})
	}

	return validationResult
}
