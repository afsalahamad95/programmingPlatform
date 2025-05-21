package validator

import (
	"code-executor/models"
	"strings"
)

type CodeValidator struct{}

func NewCodeValidator() *CodeValidator {
	return &CodeValidator{}
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
		// Clean up output by removing trailing newlines and spaces
		actualOutput := strings.TrimSpace(result[i].Stdout)
		expectedOutput := strings.TrimSpace(testCase.ExpectedOutput)

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
			ActualOutput:   actualOutput,
			Passed:         passed,
			Description:    testCase.Description,
		})
	}

	return validationResult
}
