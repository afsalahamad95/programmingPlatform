package util

import "golang.org/x/crypto/bcrypt"

// HashUserPassword hashes a user's password
func HashUserPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}
