package services

import (
	"code-executor/executor"
	"code-executor/presenter"
)

type StatusService struct {
	executor *executor.Executor
}

func NewStatusService(executor *executor.Executor) *StatusService {
	return &StatusService{
		executor: executor,
	}
}

func (s *StatusService) GetExecutionStatus(id string) (*presenter.CodeExecution, error) {
	execution := s.executor.GetExecution(id)
	if execution == nil {
		return nil, ErrExecutionNotFound
	}
	return execution, nil
}
