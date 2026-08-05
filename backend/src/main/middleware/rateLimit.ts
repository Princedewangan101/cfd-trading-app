import { type NextFunction, type Request, type Response } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "../../config/redis.js";

// ~5 auth attempts / 10 min per IP, backed by Redis so the window survives
// backend restarts and works across instances.
const authLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: "rl:auth",
    points: 5,
    duration: 60 * 10,
});

export async function rateLimitAuth(req: Request, res: Response, next: NextFunction) {
    try {
        await authLimiter.consume(req.ip ?? "unknown");
        next();
    } catch (error) {
        const blocked = error as { msBeforeNext?: number };
        const retryAfterSecs = Math.ceil((blocked.msBeforeNext ?? 60_000) / 1000);
        res.set("Retry-After", String(retryAfterSecs));
        return res.status(429).json({ success: false, message: "Too many attempts. Try again later." });
    }
}
