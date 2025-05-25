package runners

import (
	"code-executor/models"
	"fmt"
	"io"
	"os/exec"
	"runtime"
	"syscall"
	"time"
)

func RunCommand(cmd *exec.Cmd, input string, config models.ExecutionConfig) *models.ExecutionResult {
	// Set up resource limits based on platform
	if runtime.GOOS == "linux" {
		// On Linux, we can set process attributes
		if config.MemoryLimitMB > 0 {
			// Note: For proper memory limits on Linux, consider using cgroups
			// This is a simplified approach that just sets process attributes
			cmd.SysProcAttr = &syscall.SysProcAttr{
				// Basic process attributes
			}
		}
	} else if runtime.GOOS == "windows" {
		// On Windows, we can't easily set memory limits
		// We'll rely on the timeout mechanism to prevent excessive resource usage
		cmd.SysProcAttr = &syscall.SysProcAttr{
			// On Windows, this helps with process termination
			CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
		}
	}

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

	// Create channels for stdout and stderr
	stdoutDone := make(chan []byte, 1)
	stderrDone := make(chan []byte, 1)

	// Read stdout in a goroutine
	go func() {
		bytes, err := io.ReadAll(stdout)
		if err != nil {
			stderrDone <- []byte(fmt.Sprintf("Error reading stdout: %v", err))
			return
		}
		stdoutDone <- bytes
	}()

	// Read stderr in a goroutine
	go func() {
		bytes, err := io.ReadAll(stderr)
		if err != nil {
			stderrDone <- []byte(fmt.Sprintf("Error reading stderr: %v", err))
			return
		}
		stderrDone <- bytes
	}()

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

	// Create channels for timeout and completion
	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	// Set up timeout if specified
	var timeout <-chan time.Time
	if config.TimeoutSeconds > 0 {
		timeout = time.After(time.Duration(config.TimeoutSeconds) * time.Second)
	}

	// Wait for either completion or timeout
	var waitErr error
	select {
	case waitErr = <-done:
		// Process completed normally
	case <-timeout:
		// Process timed out
		if cmd.Process != nil {
			// Kill the process - this works on both Windows and Unix-like systems
			cmd.Process.Kill()
		}
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Execution timed out after %d seconds", config.TimeoutSeconds),
		}
	}

	// Wait for stdout and stderr to be read
	stdoutBytes := <-stdoutDone
	stderrBytes := <-stderrDone

	exitCode := 0
	if waitErr != nil {
		if exitErr, ok := waitErr.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
		}
	}

	// Get memory usage if available
	var memoryUsage int64
	if runtime.GOOS == "linux" && cmd.ProcessState != nil {
		// On Linux, we can get memory usage from the process state
		// Note: This is a simplified approach and may not be accurate
		// For more accurate memory tracking, consider using cgroups or other system-specific tools
		// For now, we'll just return 0 as we need to implement platform-specific memory tracking
		memoryUsage = 0
	}

	return &models.ExecutionResult{
		Stdout:      string(stdoutBytes),
		Stderr:      string(stderrBytes),
		ExitCode:    exitCode,
		MemoryUsage: memoryUsage,
	}
}
