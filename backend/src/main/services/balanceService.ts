import { prisma } from "../../config/db.js";
import { redis } from "../../config/redis.js";

const BALANCE_CACHE_TTL = 3600;

// Returns the user's balance as a number, using the Redis cache when present
// and falling back to the DB (which also re-seeds the cache). null = user gone.
export async function getCachedBalance(userId: string): Promise<number | null> {
    const cached = await redis.get(`balance:${userId}`);
    if (cached !== null) return Number(cached);

    const user = await prisma.user.findUnique({ where: { userId }, select: { balance: true } });
    if (!user) return null;

    const balance = Number(user.balance);
    await redis.set(`balance:${userId}`, String(balance), "EX", BALANCE_CACHE_TTL);
    return balance;
}

export async function setBalanceCache(userId: string, balance: number): Promise<void> {
    await redis.set(`balance:${userId}`, String(balance), "EX", BALANCE_CACHE_TTL);
}

// Applies a signed balance delta inside an existing transaction (row-locks the
// user row first). Returns the new balance.
export async function applyBalanceDelta(tx: any, userId: string, delta: number): Promise<number> {
    await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
    const result = await tx.user.update({
        where: { userId },
        data: { balance: { increment: delta } },
        select: { balance: true },
    });
    return Number(result.balance);
}
