import { Redis } from 'ioredis'

const REDIS_URL = process.env.REDIS_URL;
export const redis = REDIS_URL
    ? new Redis(REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
    });
