package schemas

// Example request and response objects for documentation
var (
	ExampleExecuteRequest = ExecuteRequest{
		Language: "python",
		Code: `def fizzbuzz(n):
    if n % 15 == 0:
        return "FizzBuzz"
    elif n % 3 == 0:
        return "Fizz"
    elif n % 5 == 0:
        return "Buzz"
    return str(n)

n = int(input())
print(fizzbuzz(n))`,
		Input: "15",
		Config: ExecutionConfig{
			TimeoutSeconds: 5,
			MemoryLimitMB:  128,
		},
		TestCases: []TestCase{
			{
				Input:          "3",
				ExpectedOutput: "Fizz",
				Description:    "Number divisible by 3",
			},
			{
				Input:          "5",
				ExpectedOutput: "Buzz",
				Description:    "Number divisible by 5",
			},
			{
				Input:          "15",
				ExpectedOutput: "FizzBuzz",
				Description:    "Number divisible by both 3 and 5",
			},
			{
				Input:          "7",
				ExpectedOutput: "7",
				Description:    "Number not divisible by 3 or 5",
			},
		},
	}

	ExampleExecuteResponse = ExecuteResponse{
		ID:       "550e8400-e29b-41d4-a716-446655440000",
		Language: "python",
		Code:     ExampleExecuteRequest.Code,
		Input:    "15",
		Status:   "completed",
		Result: &ExecutionResult{
			Stdout:        "FizzBuzz\n",
			Stderr:        "",
			ExitCode:      0,
			ExecutionTime: 0.123,
			MemoryUsage:   0,
		},
		Validation: &ValidationResult{
			Passed: true,
			TestCases: []Result{
				{
					Input:          "3",
					ExpectedOutput: "Fizz",
					ActualOutput:   "Fizz",
					Passed:         true,
					Description:    "Number divisible by 3",
				},
				{
					Input:          "5",
					ExpectedOutput: "Buzz",
					ActualOutput:   "Buzz",
					Passed:         true,
					Description:    "Number divisible by 5",
				},
				{
					Input:          "15",
					ExpectedOutput: "FizzBuzz",
					ActualOutput:   "FizzBuzz",
					Passed:         true,
					Description:    "Number divisible by both 3 and 5",
				},
				{
					Input:          "7",
					ExpectedOutput: "7",
					ActualOutput:   "7",
					Passed:         true,
					Description:    "Number not divisible by 3 or 5",
				},
			},
			Summary: Summary{
				TotalTests:  4,
				PassedTests: 4,
				FailedTests: 0,
			},
		},
	}
)
