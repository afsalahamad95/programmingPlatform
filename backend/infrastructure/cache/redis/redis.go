package cache

import (
	"context"
	"time"

	l "qms-backend/pkg/Logger"

	"github.com/redis/go-redis/v9"
)

// RedisClient is the redis client implementation
type RedisClient struct {
	client *redis.Client
}

// NewRedisClient creates a new redis client
func NewRedisClient(ctx context.Context, addr string) *RedisClient {
	redisClient := redis.NewClient(&redis.Options{
		Addr: addr,
	})
	return &RedisClient{
		client: redisClient,
	}
}

// Get fetches the value for the specified key
func (r *RedisClient) Get(ctx context.Context, key string) (interface{}, error) {
	stringCmd := r.client.Get(ctx, key)
	err := stringCmd.Err()
	if err != nil {
		l.Log.Warnf("error fetching the key, err=%v", err)
		return nil, err
	}
	var value interface{}
	err = stringCmd.Scan(value)
	if err != nil {
		l.Log.Warnf("error scanning value, err=%v", err)
		return nil, err
	}
	return value, nil
}

// Set inserts a key-value pair in the cache client
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}) error {
	status := r.client.Set(ctx, key, value, 5*time.Minute)
	err := status.Err()
	if err != nil {
		l.Log.Warnf("error setting the key in cache client, err=%v", err)
	}
	result, err := status.Result()
	if err != nil {
		l.Log.Warnf("error fetching the result status, err=%v", err)
	}
	l.Log.Warnf("Value set in cache client, code=%v", result)
	return nil
}

// Delete deletes a value based on the key from the cache client
func (r *RedisClient) Delete(ctx context.Context, key string) error {
	// todo: the client supports bulk delete based on multiple keys. Implement multi-delete.
	intCmd := r.client.Del(ctx, key)
	err := intCmd.Err()
	if err != nil {
		l.Log.Warnf("error deleting the given key, err=%v", err)
		return err
	}
	result, err := intCmd.Result()
	if err != nil {
		l.Log.Warnf("error getting the delete result, err=%v", err)
	}
	l.Log.Warnf("delete success, code = %v", result)
	return nil
}
