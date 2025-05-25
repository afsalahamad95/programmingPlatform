package executor

import (
	"code-executor/executor/languages"
	"code-executor/executor/runners"
	"code-executor/executor/store"
	"code-executor/executor/validator"
	"code-executor/models"
	"fmt"
	"os"
	"time"
)

type Executor struct {
	store        *store.ExecutionStore
	pythonRunner *runners.PythonRunner
	jsRunner     *runners.JavaScriptRunner
	validator    *validator.CodeValidator
}

func NewExecutor() *Executor {
	return &Executor{
		store:        store.NewExecutionStore(),
		pythonRunner: runners.NewPythonRunner(),
		jsRunner:     runners.NewJavaScriptRunner(),
		validator:    validator.NewCodeValidator(),
	}
}

func (e *Executor) Execute(execution *models.CodeExecution) {
	e.store.Save(execution)
	execution.Status = models.StatusRunning

	tmpDir, err := os.MkdirTemp("", "code-execution-*")
	if err != nil {
		e.handleExecutionError(execution, err)
		return
	}
	defer os.RemoveAll(tmpDir)

	result := &models.ExecutionResult{}
	startTime := time.Now()

	// Execute with main input first
	switch execution.Language {
	case "javascript":
		result = e.jsRunner.Execute(execution, tmpDir)
	case "python":
		result = e.pythonRunner.Execute(execution, tmpDir)
	default:
		e.handleExecutionError(execution, fmt.Errorf("unsupported language"))
		return
	}

	result.ExecutionTime = time.Since(startTime).Seconds()

	// Check if execution exceeded time limit
	if execution.Config.TimeoutSeconds > 0 && result.ExecutionTime > float64(execution.Config.TimeoutSeconds) {
		result.Stderr = fmt.Sprintf("Execution timed out after %.2f seconds (limit: %d seconds)",
			result.ExecutionTime, execution.Config.TimeoutSeconds)
		result.ExitCode = 1
	}

	// Check if execution exceeded memory limit
	if execution.Config.MemoryLimitMB > 0 && result.MemoryUsage > execution.Config.MemoryLimitMB*1024*1024 {
		result.Stderr = fmt.Sprintf("Execution exceeded memory limit of %d MB (used: %.2f MB)",
			execution.Config.MemoryLimitMB, float64(result.MemoryUsage)/(1024*1024))
		result.ExitCode = 1
	}

	// If test cases are provided, validate them
	if len(execution.TestCases) > 0 {
		// Run code for each test case and collect outputs
		testResults := make([]*models.ExecutionResult, len(execution.TestCases))
		for i, tc := range execution.TestCases {
			var tcResult *models.ExecutionResult
			switch execution.Language {
			case "javascript":
				tcResult = e.jsRunner.Execute(&models.CodeExecution{
					Code:     execution.Code,
					Input:    tc.Input,
					Language: execution.Language,
					Config:   execution.Config,
				}, tmpDir)
			case "python":
				tcResult = e.pythonRunner.Execute(&models.CodeExecution{
					Code:     execution.Code,
					Input:    tc.Input,
					Language: execution.Language,
					Config:   execution.Config,
				}, tmpDir)
			}
			testResults[i] = tcResult
		}
		execution.Validation = e.validator.Validate(testResults, execution.TestCases)
	}

	execution.Status = models.StatusCompleted
	execution.Result = result
	e.store.Save(execution)
}

func (e *Executor) GetExecution(id string) *models.CodeExecution {
	return e.store.Get(id)
}

func (e *Executor) handleExecutionError(execution *models.CodeExecution, err error) {
	execution.Status = models.StatusError
	execution.Result = &models.ExecutionResult{
		ExitCode: 1,
		Stderr:   err.Error(),
	}
	e.store.Save(execution)
}

func IsSupportedLanguage(language string) bool {
	return languages.IsSupported(language)
}

func GetSupportedLanguages() []string {
	return languages.GetSupported()
}
