package runners

import (
	"code-executor/models"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type JavaScriptRunner struct{}

func NewJavaScriptRunner() *JavaScriptRunner {
	return &JavaScriptRunner{}
}

func (r *JavaScriptRunner) Execute(execution *models.CodeExecution, tmpDir string) *models.ExecutionResult {
	// Create a wrapper script that handles both console.log and return values
	wrapperCode := fmt.Sprintf(`
// Capture console.log output
const originalLog = console.log;
let logs = [];

console.log = function() {
    logs.push(Array.from(arguments).join(' '));
    originalLog.apply(console, arguments);
};

// User code begins
%s
// User code ends

// Print captured output if any
if (logs.length > 0) {
    originalLog(logs.join('\\n').trim());
}
`, execution.Code)

	scriptPath := filepath.Join(tmpDir, "script.js")
	if err := os.WriteFile(scriptPath, []byte(wrapperCode), 0600); err != nil {
		return &models.ExecutionResult{
			ExitCode: 1,
			Stderr:   err.Error(),
		}
	}

	cmd := exec.Command("node", scriptPath)
	result := RunCommand(cmd, execution.Input, execution.Config)

	// Clean up any trailing newlines or whitespace from output for consistent comparison
	result.Stdout = strings.TrimSpace(result.Stdout)

	return result
}
