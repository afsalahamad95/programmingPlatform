package logger

import (
	"go.uber.org/zap"
)

// Logger is an interface that defines the basic logging methods for all log levels.
// And sync method to flush the logs in buffer before the main terminates.
// TODO: interface should be generic and not use zap dataytpes
type Logger interface {
	SetLevel(level string) error
	GetLevel() string

	// Simple to use logger interface (sugared logger)
	Debugf(template string, args ...interface{})
	Infof(template string, args ...interface{})
	Warnf(template string, args ...interface{})
	Errorf(template string, args ...interface{})
	Panicf(template string, args ...interface{})
	Fatalf(template string, args ...interface{})

	// Zap specific logging that's faster
	Debug(msg string, fields ...zap.Field)
	Info(msg string, fields ...zap.Field)
	Warn(msg string, fields ...zap.Field)
	Error(msg string, err error, fields ...zap.Field)
	Panic(msg string, fields ...zap.Field)
	Fatal(msg string, fields ...zap.Field)
	Sync() error

	GenZapBody(contentType string, body []byte) zap.Field
}
