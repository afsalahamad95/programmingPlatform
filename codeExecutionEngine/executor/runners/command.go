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

// Platform-specific resource management
type ResourceManager interface {
	SetupProcess(cmd *exec.Cmd, config models.ExecutionConfig) error
	KillProcess(cmd *exec.Cmd) error
	GetMemoryUsage(cmd *exec.Cmd) (int64, error)
}

// Unix-like systems (Linux, macOS)
type UnixResourceManager struct{}

func (m *UnixResourceManager) SetupProcess(cmd *exec.Cmd, config models.ExecutionConfig) error {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true, // Allow killing child processes
	}

	if runtime.GOOS == "linux" && config.MemoryLimitMB > 0 {
		// TODO: Implement proper memory limits using cgroups
		// For now, we'll just set basic process attributes
		// Note: Setting resource limits directly is not supported in Go's syscall package
		// We would need to use cgroups or other system-specific tools
	}
	return nil
}

func (m *UnixResourceManager) KillProcess(cmd *exec.Cmd) error {
	if cmd.Process != nil {
		return syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	}
	return nil
}

func (m *UnixResourceManager) GetMemoryUsage(cmd *exec.Cmd) (int64, error) {
	if cmd.ProcessState == nil {
		return 0, fmt.Errorf("process not completed")
	}
	// TODO: Implement proper memory usage tracking
	// For now, return 0 as we need platform-specific implementation
	return 0, nil
}

// Windows resource manager
type WindowsResourceManager struct{}

func (m *WindowsResourceManager) SetupProcess(cmd *exec.Cmd, config models.ExecutionConfig) error {
	// Windows doesn't support easy memory limits
	// We'll rely on the timeout mechanism
	return nil
}

func (m *WindowsResourceManager) KillProcess(cmd *exec.Cmd) error {
	if cmd.Process != nil {
		return cmd.Process.Kill()
	}
	return nil
}

func (m *WindowsResourceManager) GetMemoryUsage(cmd *exec.Cmd) (int64, error) {
	// TODO: Implement Windows-specific memory usage tracking
	return 0, nil
}

// Get the appropriate resource manager for the current platform
func getResourceManager() ResourceManager {
	switch runtime.GOOS {
	case "windows":
		return &WindowsResourceManager{}
	default:
		return &UnixResourceManager{}
	}
}

func RunCommand(cmd *exec.Cmd, input string, config models.ExecutionConfig) *models.ExecutionResult {
	// Get platform-specific resource manager
	resourceManager := getResourceManager()

	// Set up process with resource limits
	if err := resourceManager.SetupProcess(cmd, config); err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   fmt.Sprintf("Error setting up process: %v", err),
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
		if err := resourceManager.KillProcess(cmd); err != nil {
			return &models.ExecutionResult{
				ExitCode: 1,
				Stderr:   fmt.Sprintf("Error killing timed out process: %v", err),
			}
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

	// Get memory usage
	memoryUsage, _ := resourceManager.GetMemoryUsage(cmd)

	return &models.ExecutionResult{
		Stdout:      string(stdoutBytes),
		Stderr:      string(stderrBytes),
		ExitCode:    exitCode,
		MemoryUsage: memoryUsage,
	}
}
