package services

import (
	"code-executor/executor"
	presenter "code-executor/models"
	"time"

	"github.com/google/uuid"
)

type ExecutionService struct {
	executor      *executor.Executor
	statusService *StatusService
}

func NewExecutionService(executor *executor.Executor, statusService *StatusService) *ExecutionService {
	return &ExecutionService{
		executor:      executor,
		statusService: statusService,
	}
}

func (s *ExecutionService) ExecuteAndWaitForResult(request *presenter.ExecuteRequest) (*presenter.CodeExecution, error) {
	// Create execution instance
	execution := &presenter.CodeExecution{
		ID:        uuid.New().String(),
		Language:  request.Language,
		Code:      request.Code,
		Input:     request.Input,
		Status:    presenter.StatusPending,
		Config:    request.Config,
		TestCases: request.TestCases,
	}

	// Start execution
	go s.executor.Execute(execution)

	// Wait for execution to complete with timeout
	timeout := time.After(10 * time.Second)
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-timeout:
			return execution, nil
		case <-ticker.C:
			currentExecution, err := s.statusService.GetExecutionStatus(execution.ID)
			if err != nil {
				return nil, err
			}

			if currentExecution.Status == presenter.StatusCompleted ||
				currentExecution.Status == presenter.StatusError {
				return currentExecution, nil
			}
		}
	}
}
