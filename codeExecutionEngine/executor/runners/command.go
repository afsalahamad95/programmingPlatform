package runners

import (
	"code-executor/models"
	"fmt"
	"io"
	"os/exec"
)

func RunCommand(cmd *exec.Cmd, input string) *models.ExecutionResult {
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Error creating stdin pipe: %v", err),
		}
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Error creating stdout pipe: %v", err),
		}
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Error creating stderr pipe: %v", err),
		}
	}

	if err := cmd.Start(); err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Error starting command: %v", err),
		}
	}

	// Write input and ensure it ends with a newline
	if input != "" {
		if _, err := io.WriteString(stdin, input); err != nil {
			return &models.ExecutionResult{
				ExitCode: 1,
				Stderr:   fmt.Sprintf("Error writing to stdin: %v", err),
			}
		}
		// Add a newline to the input if it doesn't have one
		if input[len(input)-1] != '\n' {
			io.WriteString(stdin, "\n")
		}
	}
	stdin.Close()

	stdoutBytes, err := io.ReadAll(stdout)
	if err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Error reading stdout: %v", err),
		}
	}

	stderrBytes, err := io.ReadAll(stderr)
	if err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Error reading stderr: %v", err),
		}
	}

	err = cmd.Wait()
	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	return &models.ExecutionResult{
		Stdout:   string(stdoutBytes),
		Stderr:   string(stderrBytes),
		ExitCode: exitCode,
	}
}
