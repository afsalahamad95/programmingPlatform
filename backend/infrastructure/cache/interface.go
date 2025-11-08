package cache

import "context"

// Cache is the interface for caching implementations
type Cache interface {
	Get(ctx context.Context, key string) (interface{}, error)
	Set(ctx context.Context, key string, value interface{}) error
	Delete(ctx context.Context, key string) error
}
