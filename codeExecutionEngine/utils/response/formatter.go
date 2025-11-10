package response

import (
	presenter "code-executor/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

func FormatExecutionResponse(c *gin.Context, execution *presenter.CodeExecution) {
	c.JSON(http.StatusOK, gin.H{
		"id":         execution.ID,
		"language":   execution.Language,
		"code":       execution.Code,
		"input":      execution.Input,
		"status":     execution.Status,
		"result":     execution.Result,
		"validation": execution.Validation,
	})
}

func FormatErrorResponse(c *gin.Context, statusCode int, err error) {
	c.JSON(statusCode, gin.H{
		"error": err.Error(),
	})
}
