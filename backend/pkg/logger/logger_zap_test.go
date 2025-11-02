package logger

import (
	"bytes"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func TestNewLoggerZap(t *testing.T) {
	tests := []struct {
		name     string
		envLevel string
		wantNil  bool
	}{
		{
			name:     "Create logger with debug level",
			envLevel: "debug",
			wantNil:  false,
		},
		{
			name:     "Create logger with info level",
			envLevel: "info",
			wantNil:  false,
		},
		{
			name:     "Create logger with invalid level",
			envLevel: "invalid",
			wantNil:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("LOG_LEVEL", tt.envLevel)
			defer os.Unsetenv("LOG_LEVEL")

			logger := NewLoggerZap()

			if tt.wantNil {
				assert.Nil(t, logger)
			} else {
				assert.NotNil(t, logger)
				assert.NotNil(t, logger.GetLogger())
				assert.NotNil(t, logger.GetSugar())
			}
		})
	}
}

func TestZapLoggerImpl_SetLevel(t *testing.T) {
	logger := NewLoggerZap()
	assert.NotNil(t, logger)

	tests := []struct {
		name    string
		level   string
		wantErr bool
	}{
		{
			name:    "Set debug level",
			level:   "debug",
			wantErr: false,
		},
		{
			name:    "Set info level",
			level:   "info",
			wantErr: false,
		},
		{
			name:    "Set warn level",
			level:   "warn",
			wantErr: false,
		},
		{
			name:    "Set error level",
			level:   "error",
			wantErr: false,
		},
		{
			name:    "Set fatal level",
			level:   "fatal",
			wantErr: false,
		},
		{
			name:    "Set panic level",
			level:   "panic",
			wantErr: false,
		},
		{
			name:    "Set invalid level",
			level:   "invalid",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := logger.SetLevel(tt.level)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.level, logger.GetLevel())
			}
		})
	}
}

func TestZapLoggerImpl_LoggingMethods(t *testing.T) {
	var buf bytes.Buffer
	encoder := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
	core := zapcore.NewCore(encoder, zapcore.AddSync(&buf), zapcore.DebugLevel)

	testLogger := &ZapLoggerImpl{
		logger: zap.New(core),
		sugar:  zap.New(core).Sugar(),
	}

	tests := []struct {
		name     string
		logFunc  func()
		expected string
	}{
		{
			name: "Debugf",
			logFunc: func() {
				testLogger.Debugf("test debug %s", "message")
			},
			expected: "test debug message",
		},
		{
			name: "Infof",
			logFunc: func() {
				testLogger.Infof("test info %s", "message")
			},
			expected: "test info message",
		},
		{
			name: "Warnf",
			logFunc: func() {
				testLogger.Warnf("test warn %s", "message")
			},
			expected: "test warn message",
		},
		{
			name: "Errorf",
			logFunc: func() {
				testLogger.Errorf("test error %s", "message")
			},
			expected: "test error message",
		},
		{
			name: "Debug with multiple args",
			logFunc: func() {
				testLogger.Debugf("test %s %d %v", "debug", 42, true)
			},
			expected: "test debug 42 true",
		},
		{
			name: "Info with empty message",
			logFunc: func() {
				testLogger.Infof("")
			},
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buf.Reset()
			tt.logFunc()

			var logEntry map[string]interface{}
			err := json.Unmarshal(buf.Bytes(), &logEntry)
			assert.NoError(t, err)
			assert.Contains(t, logEntry["msg"], tt.expected)
		})
	}
}

func TestZapLoggerImpl_StructuredLogging(t *testing.T) {
	var buf bytes.Buffer
	encoder := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
	core := zapcore.NewCore(encoder, zapcore.AddSync(&buf), zapcore.DebugLevel)
	logger := &ZapLoggerImpl{
		logger: zap.New(core),
		sugar:  zap.New(core).Sugar(),
	}

	tests := []struct {
		name     string
		logFunc  func()
		fields   []zap.Field
		expected map[string]interface{}
	}{
		{
			name: "Debug with fields",
			logFunc: func() {
				logger.Debug("test debug", zap.String("key", "value"))
			},
			fields: []zap.Field{zap.String("key", "value")},
			expected: map[string]interface{}{
				"msg": "test debug",
				"key": "value",
			},
		},
		{
			name: "Info with fields",
			logFunc: func() {
				logger.Info("test info", zap.Int("count", 42))
			},
			fields: []zap.Field{zap.Int("count", 42)},
			expected: map[string]interface{}{
				"msg":   "test info",
				"count": float64(42),
			},
		},
		{
			name: "Error with error field",
			logFunc: func() {
				logger.Error("test error", errors.New("test error"), zap.String("context", "test"))
			},
			fields: []zap.Field{
				zap.Error(errors.New("test error")),
				zap.String("context", "test"),
			},
			expected: map[string]interface{}{
				"msg":     "test error",
				"error":   "test error",
				"context": "test",
			},
		},
		{
			name: "Warn with multiple fields",
			logFunc: func() {
				logger.Warn("test warn",
					zap.Bool("flag", true),
					zap.Float64("score", 95.5),
					zap.Strings("tags", []string{"tag1", "tag2"}),
				)
			},
			fields: []zap.Field{
				zap.Bool("flag", true),
				zap.Float64("score", 95.5),
				zap.Strings("tags", []string{"tag1", "tag2"}),
			},
			expected: map[string]interface{}{
				"msg":   "test warn",
				"flag":  true,
				"score": 95.5,
				"tags":  []interface{}{"tag1", "tag2"},
			},
		},
		{
			name: "Empty message with fields",
			logFunc: func() {
				logger.Info("", zap.String("key", "value"))
			},
			fields: []zap.Field{zap.String("key", "value")},
			expected: map[string]interface{}{
				"msg": "",
				"key": "value",
			},
		},
		{
			name: "Nil error field",
			logFunc: func() {
				logger.Error("test error", nil, zap.String("context", "test"))
			},
			fields: []zap.Field{
				zap.Error(nil),
				zap.String("context", "test"),
			},
			expected: map[string]interface{}{
				"msg":     "test error",
				"context": "test",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			buf.Reset()
			tt.logFunc()

			var logEntry map[string]interface{}
			err := json.Unmarshal(buf.Bytes(), &logEntry)
			assert.NoError(t, err)

			for key, value := range tt.expected {
				assert.Equal(t, value, logEntry[key])
			}
		})
	}
}

func TestZapLoggerImpl_GenZapBody(t *testing.T) {
	logger := &ZapLoggerImpl{}

	tests := []struct {
		name        string
		contentType string
		body        []byte
		expected    interface{}
	}{
		{
			name:        "JSON object",
			contentType: HTTPContentTypeJSON,
			body:        []byte(`{"key": "value"}`),
			expected:    map[string]interface{}{"key": "value"},
		},
		{
			name:        "JSON array",
			contentType: HTTPContentTypeJSON,
			body:        []byte(`[{"key": "value"}]`),
			expected:    []map[string]interface{}{{"key": "value"}},
		},
		{
			name:        "Non-JSON content",
			contentType: "text/plain",
			body:        []byte("plain text"),
			expected:    []byte{},
		},
		{
			name:        "Invalid JSON",
			contentType: HTTPContentTypeJSON,
			body:        []byte(`{"key": value}`),
			expected:    map[string]interface{}(nil),
		},
		{
			name:        "Empty body",
			contentType: HTTPContentTypeJSON,
			body:        []byte{},
			expected:    map[string]interface{}(nil),
		},
		{
			name:        "Empty JSON object",
			contentType: HTTPContentTypeJSON,
			body:        []byte(`{}`),
			expected:    map[string]interface{}{},
		},
		{
			name:        "Empty JSON array",
			contentType: HTTPContentTypeJSON,
			body:        []byte(`[]`),
			expected:    []map[string]interface{}{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := logger.GenZapBody(tt.contentType, tt.body)
			assert.NotNil(t, field)
			assert.Equal(t, tt.expected, field.Interface)
		})
	}
}

func TestZapLoggerImpl_Sync(t *testing.T) {
	var buf bytes.Buffer
	encoder := zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig())
	core := zapcore.NewCore(encoder, zapcore.AddSync(&buf), zapcore.DebugLevel)
	logger := &ZapLoggerImpl{
		logger: zap.New(core),
		sugar:  zap.New(core).Sugar(),
	}

	err := logger.Sync()
	assert.NoError(t, err)

	realLogger := NewLoggerZap()
	assert.NotNil(t, realLogger)

	err = realLogger.Sync()
	if err != nil {
		assert.True(t, strings.Contains(err.Error(), "stderr") || strings.Contains(err.Error(), "ioctl"))
	}
}
