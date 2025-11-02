package logger

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/urfave/negroni"
)

func setLogLevel(logger Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errorMessage := "Unable to set log level"
		vars := mux.Vars(r)

		err := logger.SetLevel(vars["level"])
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(errorMessage + ":" + err.Error()))
			return
		}
		w.WriteHeader(http.StatusOK)
	})
}

func getLogLevel(logger Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		level := logger.GetLevel()
		_, _ = w.Write([]byte(level))
		w.WriteHeader(http.StatusOK)
	})
}

// MakeLogHandlers make log handlers
func MakeLogHandlers(r *mux.Router, n negroni.Negroni, serviceName string, logger Logger) {
	// TODO: implement this
}
