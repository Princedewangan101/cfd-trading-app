import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { redis as redisClient } from '../redis';
// import { AuthRequest } from '../../types';


const tradingRouterTokenBucketLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'gw_token_user',
    points: 100, 
    duration: 1, 
    execEvenly: false, 
});

const moneyOperationRouteTokenBucketLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'gw_token_user',
    points: 5, 
    duration: 60, 
    execEvenly: false, 
});

const authenthicationTokenBucketLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'gw_token_user',
    points: 5, // CAPACITY
    duration: 300, // REFILL
    blockDuration: 3600,
    execEvenly: false, 
});



export const TRADING_RL = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;

    if (!userId) return res.status(404).json({ message: 'MISSING userId ON RL  !' })

    try {
        await tradingRouterTokenBucketLimiter.consume(userId);

        next();

    } catch (error: any) {
        res.status(429).json({
            error: error.message,
            message: 'TOO MANY REQUEST , RETRY AFTER SOME TIME !!!'
        });
    }

}

export const MONEY_OPERATION_RL = async (req: Request, res: Response, next: NextFunction) => {
   const userId = req.userId;

    if (!userId) return res.status(404).json({ message: 'MISSING userId ON RL  !' })

    try {
        await moneyOperationRouteTokenBucketLimiter.consume(userId);

        next();

    } catch (error: any) {
        res.status(429).json({
            error: error.message,
            message: 'TOO MANY REQUEST , RETRY AFTER SOME TIME !!!'
        });
    }

}

export const AUTH_RL = async (req: Request, res: Response, next: NextFunction) => {
    const email = req.body.email;

    if (!email) return res.status(404).json({ message: 'MISSING email ON RL  !' })

    try {
        await authenthicationTokenBucketLimiter.consume(email);

        next();

    } catch (error: any) {
        res.status(429).json({
            error: error.message,
            message: 'TOO MANY REQUEST , RETRY AFTER SOME TIME !!!'
        });
    }
}
