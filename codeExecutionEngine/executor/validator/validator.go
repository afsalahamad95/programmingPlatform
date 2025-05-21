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
		// Use exact string comparison (no normalization)
		actualOutput := result[i].Stdout
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

		// Print first mismatch
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

		passed := trimmedExpected == trimmedActual

		if passed {
			validationResult.Summary.PassedTests++
		} else {
			validationResult.Summary.FailedTests++
			validationResult.Passed = false
		}

		validationResult.TestCases = append(validationResult.TestCases, models.Result{
			Input:          testCase.Input,
			ExpectedOutput: testCase.ExpectedOutput,
			ActualOutput:   result[i].Stdout,
			Passed:         passed,
			Description:    testCase.Description,
		})
	}

	return validationResult
}
