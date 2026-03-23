package cache

import (
	"context"
	"time"
)

// Cache is the interface for caching implementations
type Cache interface {
	Get(ctx context.Context, key string) (string, error)
	Set(ctx context.Context, key string, value string, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	DeleteByPrefix(ctx context.Context, prefix string) error
	Ping(ctx context.Context) error
}
