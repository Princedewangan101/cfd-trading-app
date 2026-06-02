import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { check } from '../util/IdempotencyCheck.js';
import { OrderStatus } from '../../generated/prisma/client.js';


export async function marketOrder(req: Request, res: Response) {
    const userId = "7dda8668-3247-4111-884c-ec8092035851";
    const { ikey, symbol, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !side || !quantity || !leverage) { return res.status(404).json({ success: false, message: "missing required fields !" }) }

    try {
        await check(res, ikey, userId, "marketOrder");

        const livePrice = Number(await redis.get(`LIVE-PRICE-${symbol}`));
        const orderCost = Number(quantity) * (Number(livePrice) / Number(leverage));
        const fee = 0.20 // dollar per quantity
        const orderCostWithFee = orderCost + (Number(quantity) * Number(fee))

        let availableBalance;
        let userAvailableBalanceQuery;

        const isAvailableBalanceInCache = await redis.exists(`availableBalance:${userId}`)
        console.log("isAvailableBalanceInCache :", isAvailableBalanceInCache);

        if (isAvailableBalanceInCache === 1) {
            availableBalance = await redis.get(`availableBalance:${userId}`)
            console.log("availableBalance :", availableBalance);
        } else {
            userAvailableBalanceQuery = await prisma.user.findUnique({ where: { userId }, select: { availableBalance: true } })
            console.log("userAvailableBlnceQuery :", userAvailableBalanceQuery);
            availableBalance = userAvailableBalanceQuery?.availableBalance
        }

        console.log(`{lp:${livePrice}, oc:${orderCost}, fee:${fee}, avb:${availableBalance}`);

        if (!availableBalance) {
            return res.status(404).json({ success: false, message: "Available balance not found." })
        }

        const hasBalance = Number(availableBalance) >= Number(orderCost) ? true : false

        if (!hasBalance) {
            return res.status(404).json({ success: false, message: "Insufficient balance." })
        }


        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { decrement: Number(orderCostWithFee) }, lockedBalance: { increment: Number(orderCost) } }
            })

            const transactionResult = await tx.order.create({
                data: {
                    userId, symbol, side, quantity, leverage, openPrice: livePrice, closePrice: null, tp: null, sl: null,
                    status: OrderStatus.EXECUTED
                }
            })
            return { transactionResult, availableBalance: updateBalanceResult.availableBalance };
        }, { maxWait: 5000, timeout: 10000 })

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to create order.')
            return res.status(404).json({ success: false, message: "Failed to create order." })
        }
        
        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);

        const { orderId, openPrice, status, createdAt } = result.transactionResult;

        await setIdemResponse(ikey, userId, JSON.stringify({ orderId, price: openPrice, createdAt }))
        console.log("---------------complete");
        return res.status(201).json({ success: true, data: { orderId, price: openPrice, status, createdAt } })

    } catch (error: any) {
        console.log("ERROR (marketOrder) : ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`)
        console.log("---------------error");
        return res.status(500).json({ success: false, message: `${error.message}` })
    }
} 