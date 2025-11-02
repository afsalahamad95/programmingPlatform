package util

import "os"

// GetEnvWithDefault gets a configuration value from the environment
// note: use viper instead?
func GetEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
