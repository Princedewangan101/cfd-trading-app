package config

import "github.com/redis/go-redis/v9"

var RedisClient = redis.NewClient(&redis.Options{
	Addr: "localhost:6379",
})
