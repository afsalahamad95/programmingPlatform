package store

import (
	presenter "code-executor/models"
	"sync"
)

type ExecutionStore struct {
	executions map[string]*presenter.CodeExecution
	mutex      sync.RWMutex
}

func NewExecutionStore() *ExecutionStore {
	return &ExecutionStore{
		executions: make(map[string]*presenter.CodeExecution),
	}
}

func (s *ExecutionStore) Save(execution *presenter.CodeExecution) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.executions[execution.ID] = execution
}

func (s *ExecutionStore) Get(id string) *presenter.CodeExecution {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.executions[id]
}
