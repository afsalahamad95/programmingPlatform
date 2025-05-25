package runners

import (
	"code-executor/models"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

type PythonRunner struct{}

func NewPythonRunner() *PythonRunner {
	return &PythonRunner{}
}

func (r *PythonRunner) Execute(execution *models.CodeExecution, tmpDir string) *models.ExecutionResult {
	// Debug log
	fmt.Printf("Executing Python code: \n%s\n", execution.Code)
	fmt.Printf("Input: '%s'\n", execution.Input)

	// Write the user's code directly to a file
	scriptPath := filepath.Join(tmpDir, "script.py")
	if err := os.WriteFile(scriptPath, []byte(execution.Code), 0600); err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   err.Error(),
		}
	}

	// Use the correct Python interpreter based on OS
	pythonCmd := "python"

	// On Windows, python3 might not be in the PATH, so try python first
	if _, err := exec.LookPath("python"); err != nil {
		pythonCmd = "python3"
	}

	// Execute the Python script with unbuffered output (-u flag)
	cmd := exec.Command(pythonCmd, "-u", scriptPath)

	// Pass any input to the script and the execution config
	result := RunCommand(cmd, execution.Input, execution.Config)

	// Debug log
	fmt.Printf("Result: exitCode=%d, stdout='%s', stderr='%s'\n",
		result.ExitCode, result.Stdout, result.Stderr)

	// If there's a syntax error or other error (non-zero exit code), make sure it's visible
	if result.ExitCode != 0 && result.Stderr != "" {
		// Format the error message more clearly
		result.Stderr = fmt.Sprintf("Python Error: %s", result.Stderr)
		fmt.Println(result.Stderr)
	}

	return result
}
