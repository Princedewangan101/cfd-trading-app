import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { redis as redisClient } from '../redis';

// THIS SAVES FROM GRABAGE TRAFFICES
const slidingWindowCounterIpLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'slidingWindowCounterIpLimiter_ip',
    points: 50, // THREASHOLD
    duration: 10,  // WINDOW
    blockDuration: 60 * 5,
})


export const globalRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip;

    if (!ip) return res.status(404).json({ message: 'MISSING IP ON RL  !' })

    try {
        await slidingWindowCounterIpLimiter.consume(ip);

        next();

    } catch (error: any) {
        res.status(429).json({
            error: error.message,
            message: 'TOO MANY REQUEST , RETRY AFTER SOME TIME !!!'
        });
    }

}
