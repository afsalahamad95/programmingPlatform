package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"qms-backend/infrastructure/cache"
)

// CacheClient is the shared cache client accessible by all handlers.
// Initialized in main.go. May be nil if Redis is unavailable.
var CacheClient cache.Cache

// DefaultCacheTTL is the default cache duration for read-heavy endpoints
const DefaultCacheTTL = 2 * time.Minute

// CacheGet attempts to read a cached JSON value and unmarshal it into dest.
// Returns true if cache hit, false if cache miss or error.
func CacheGet(ctx context.Context, key string, dest interface{}) bool {
	if CacheClient == nil {
		return false
	}

	val, err := CacheClient.Get(ctx, key)
	if err != nil {
		// Cache miss — not an error worth logging (redis.Nil)
		return false
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		log.Printf("[cache] unmarshal error for key=%s: %v", key, err)
		return false
	}

	log.Printf("[cache] HIT key=%s", key)
	return true
}

// CacheSet serializes value as JSON and stores it with the given TTL.
func CacheSet(ctx context.Context, key string, value interface{}, ttl time.Duration) {
	if CacheClient == nil {
		return
	}

	data, err := json.Marshal(value)
	if err != nil {
		log.Printf("[cache] marshal error for key=%s: %v", key, err)
		return
	}

	if err := CacheClient.Set(ctx, key, string(data), ttl); err != nil {
		log.Printf("[cache] SET error for key=%s: %v", key, err)
		return
	}

	log.Printf("[cache] SET key=%s ttl=%v", key, ttl)
}

// CacheInvalidate deletes a specific cache key.
func CacheInvalidate(ctx context.Context, key string) {
	if CacheClient == nil {
		return
	}
	if err := CacheClient.Delete(ctx, key); err != nil {
		log.Printf("[cache] DELETE error for key=%s: %v", key, err)
	}
}

// CacheInvalidatePrefix deletes all keys matching a prefix.
// Useful for invalidating e.g. all "test_results:" keys after a mutation.
func CacheInvalidatePrefix(ctx context.Context, prefix string) {
	if CacheClient == nil {
		return
	}
	if err := CacheClient.DeleteByPrefix(ctx, prefix); err != nil {
		log.Printf("[cache] DELETE prefix=%s error: %v", prefix, err)
	}
}

// CacheKey builds a namespaced cache key.
func CacheKey(parts ...string) string {
	key := ""
	for i, p := range parts {
		if i > 0 {
			key += ":"
		}
		key += p
	}
	return fmt.Sprintf("qms:%s", key)
}
