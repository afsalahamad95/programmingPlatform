package logger

// import (
// 	"errors"
// 	"net/http"
// 	"net/http/httptest"
// 	"testing"

// 	mock_logger "qms-backend/pkg/logger/mock"

// 	"github.com/golang/mock/gomock"
// 	"github.com/gorilla/mux"
// 	"github.com/stretchr/testify/assert"
// 	"github.com/urfave/negroni"
// )

// func Test_SetLogLevel(t *testing.T) {
// 	tests := []struct {
// 		name           string
// 		level          string
// 		expectedStatus int
// 		expectedBody   string
// 	}{
// 		{
// 			name:           "Set valid log level",
// 			level:          "debug",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "",
// 		},
// 		{
// 			name:           "Set another valid log level",
// 			level:          "info",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "",
// 		},
// 		{
// 			name:           "Set warn log level",
// 			level:          "warn",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "",
// 		},
// 		{
// 			name:           "Set error log level",
// 			level:          "error",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "",
// 		},
// 		{
// 			name:           "Set fatal log level",
// 			level:          "fatal",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "",
// 		},
// 		{
// 			name:           "Set panic log level",
// 			level:          "panic",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "",
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			ctrl := gomock.NewController(t)
// 			defer ctrl.Finish()

// 			router := mux.NewRouter()
// 			mockLogger := mock_logger.NewMockLogger(ctrl)
// 			n := negroni.New()

// 			mockLogger.EXPECT().SetLevel(tt.level).Return(nil)

// 			MakeLogHandlers(router, *n, "test-service", mockLogger)

// 			req, err := http.NewRequest(http.MethodPost, "/v1/test-service/log/"+tt.level, nil)
// 			assert.NoError(t, err)

// 			rr := httptest.NewRecorder()
// 			router.ServeHTTP(rr, req)
// 			assert.Equal(t, tt.expectedStatus, rr.Code)
// 			assert.Equal(t, tt.expectedBody, rr.Body.String())
// 		})
// 	}
// }

// func Test_GetLogLevel(t *testing.T) {
// 	tests := []struct {
// 		name           string
// 		initialLevel   string
// 		expectedStatus int
// 		expectedBody   string
// 	}{
// 		{
// 			name:           "Get debug log level",
// 			initialLevel:   "debug",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "debug",
// 		},
// 		{
// 			name:           "Get info log level",
// 			initialLevel:   "info",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "info",
// 		},
// 		{
// 			name:           "Get warn log level",
// 			initialLevel:   "warn",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "warn",
// 		},
// 		{
// 			name:           "Get error log level",
// 			initialLevel:   "error",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "error",
// 		},
// 		{
// 			name:           "Get fatal log level",
// 			initialLevel:   "fatal",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "fatal",
// 		},
// 		{
// 			name:           "Get panic log level",
// 			initialLevel:   "panic",
// 			expectedStatus: http.StatusOK,
// 			expectedBody:   "panic",
// 		},
// 	}

// 	for _, tt := range tests {
// 		t.Run(tt.name, func(t *testing.T) {
// 			ctrl := gomock.NewController(t)
// 			defer ctrl.Finish()

// 			router := mux.NewRouter()
// 			mockLogger := mock_logger.NewMockLogger(ctrl)
// 			n := negroni.New()

// 			mockLogger.EXPECT().GetLevel().Return(tt.initialLevel)

// 			MakeLogHandlers(router, *n, "test-service", mockLogger)

// 			req, err := http.NewRequest(http.MethodGet, "/v1/test-service/log", nil)
// 			assert.NoError(t, err)

// 			rr := httptest.NewRecorder()

// 			router.ServeHTTP(rr, req)

// 			assert.Equal(t, tt.expectedStatus, rr.Code)

// 			assert.Equal(t, tt.expectedBody, rr.Body.String())
// 		})
// 	}
// }

// func Test_MakeLogHandlers(t *testing.T) {
// 	ctrl := gomock.NewController(t)
// 	defer ctrl.Finish()

// 	router := mux.NewRouter()
// 	mockLogger := mock_logger.NewMockLogger(ctrl)
// 	n := negroni.New()

// 	mockLogger.EXPECT().GetLevel().Return("debug")
// 	mockLogger.EXPECT().SetLevel("debug").Return(nil).AnyTimes()

// 	MakeLogHandlers(router, *n, "test-service", mockLogger)

// 	req, err := http.NewRequest(http.MethodPost, "/v1/test-service/log/debug", nil)
// 	assert.NoError(t, err)
// 	rr := httptest.NewRecorder()
// 	router.ServeHTTP(rr, req)
// 	assert.Equal(t, http.StatusOK, rr.Code)

// 	req, err = http.NewRequest(http.MethodGet, "/v1/test-service/log", nil)
// 	assert.NoError(t, err)
// 	rr = httptest.NewRecorder()
// 	router.ServeHTTP(rr, req)
// 	assert.Equal(t, http.StatusOK, rr.Code)

// 	req, err = http.NewRequest(http.MethodPut, "/v1/test-service/log/debug", nil)
// 	assert.NoError(t, err)
// 	rr = httptest.NewRecorder()
// 	router.ServeHTTP(rr, req)
// 	assert.Equal(t, http.StatusOK, rr.Code)
// }

// func Test_SetLogLevelWithInvalidLevel(t *testing.T) {
// 	ctrl := gomock.NewController(t)
// 	defer ctrl.Finish()

// 	router := mux.NewRouter()
// 	mockLogger := mock_logger.NewMockLogger(ctrl)
// 	n := negroni.New()

// 	mockLogger.EXPECT().SetLevel("invalid-level").Return(errors.New("invalid log level"))

// 	MakeLogHandlers(router, *n, "test-service", mockLogger)

// 	req, err := http.NewRequest(http.MethodPost, "/v1/test-service/log/invalid-level", nil)
// 	assert.NoError(t, err)

// 	rr := httptest.NewRecorder()

// 	router.ServeHTTP(rr, req)

// 	assert.Equal(t, http.StatusInternalServerError, rr.Code)

// 	assert.Contains(t, rr.Body.String(), "Unable to set log level")
// }

// func Test_GetLogLevelWithEmptyLevel(t *testing.T) {
// 	ctrl := gomock.NewController(t)
// 	defer ctrl.Finish()

// 	router := mux.NewRouter()
// 	mockLogger := mock_logger.NewMockLogger(ctrl)
// 	n := negroni.New()

// 	mockLogger.EXPECT().GetLevel().Return("")

// 	MakeLogHandlers(router, *n, "test-service", mockLogger)

// 	req, err := http.NewRequest(http.MethodGet, "/v1/test-service/log", nil)
// 	assert.NoError(t, err)

// 	rr := httptest.NewRecorder()

// 	router.ServeHTTP(rr, req)

// 	assert.Equal(t, http.StatusOK, rr.Code)

// 	assert.Equal(t, "", rr.Body.String())
// }
