package handlers

import (
	"code-executor/executor"
	"code-executor/presenter"
	"code-executor/services"
	"code-executor/utils/response"
	"errors"
	"github.com/gin-gonic/gin"
	"net/http"
)

type ExecuteHandler struct {
	executor         *executor.Executor
	statusService    *services.StatusService
	executionService *services.ExecutionService
}

func NewExecuteHandler(executor *executor.Executor) *ExecuteHandler {
	statusService := services.NewStatusService(executor)
	return &ExecuteHandler{
		executor:         executor,
		statusService:    statusService,
		executionService: services.NewExecutionService(executor, statusService),
	}
}

func (h *ExecuteHandler) ExecuteCode(c *gin.Context) {
	var request presenter.ExecuteRequest

	if err := c.BindJSON(&request); err != nil {
		response.FormatErrorResponse(c, http.StatusBadRequest, err)
		return
	}

	if !executor.IsSupportedLanguage(request.Language) {
		response.FormatErrorResponse(c, http.StatusBadRequest, errors.New("unsupported language"))
		return
	}

	execution, err := h.executionService.ExecuteAndWaitForResult(&request)
	if err != nil {
		response.FormatErrorResponse(c, http.StatusInternalServerError, err)
		return
	}

	response.FormatExecutionResponse(c, execution)
}

func (h *ExecuteHandler) GetExecutionStatus(c *gin.Context) {
	id := c.Param("id")

	execution, err := h.statusService.GetExecutionStatus(id)
	if err != nil {
		switch err {
		case services.ErrExecutionNotFound:
			response.FormatErrorResponse(c, http.StatusNotFound, err)
		default:
			response.FormatErrorResponse(c, http.StatusInternalServerError, err)
		}
		return
	}

	response.FormatExecutionResponse(c, execution)
}

func (h *ExecuteHandler) GetSupportedLanguages(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"languages": executor.GetSupportedLanguages(),
	})
}
