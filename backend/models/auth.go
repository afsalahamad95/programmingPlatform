package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// AuthUser represents a user in the authentication system
type AuthUser struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Email         string             `json:"email" bson:"email"`
	Password      string             `json:"-" bson:"password"` // Password is not returned in JSON
	PasswordHash  string             `json:"-" bson:"passwordHash"`
	FirstName     string             `json:"firstName" bson:"firstName"`
	LastName      string             `json:"lastName" bson:"lastName"`
	Role          string             `json:"role" bson:"role"` // admin, instructor, or student
	OAuthID       string             `json:"-" bson:"oauthId,omitempty"`
	OAuthProvider string             `json:"-" bson:"oauthProvider,omitempty"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt"`
}

// LoginRequest is the request body for email/password login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse is the response body for successful login
type LoginResponse struct {
	Token string   `json:"token"`
	User  AuthUser `json:"user"`
	Role  string   `json:"role"`
}

// RegisterRequest is the request body for user registration
type RegisterRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// OAuthCallbackRequest is the request body for OAuth callback
type OAuthCallbackRequest struct {
	Provider    string `json:"provider"`
	Code        string `json:"code"`
	RedirectURI string `json:"redirectUri"`
}

// OAuthUserInfo represents user info received from OAuth providers
type OAuthUserInfo struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Name      string `json:"name"`
	Picture   string `json:"picture"`
}

// TokenClaims represents the claims in a JWT token
type TokenClaims struct {
	UserID string `json:"userId"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Exp    int64  `json:"exp"`
}
