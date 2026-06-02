import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { OrderStatus } from '../../generated/prisma/client.js';
import { check } from '../util/IdempotencyCheck.js';

// 1. IDEMPOTENCY CHECK.
// 2. CHECKED THAT USER HAS ENOUGH AVAILABLE BALANCE OR NOT (IF AVAILABLE BALANCE IS NOT IN CACHE THEN, WE FETCH FROM DB AND USE IT, CACHE IT).
// 3. ATOMIC TRANSACTION : DECREMENT AVAILABLE BALANCE, INCREMENT LOCK BALANCE IN USER TABLE, RECORD TRANSACTION, CREATE IKEY RECORD.
// 4. PUSH ORDER INTO REDIS SORTED SET FOR LIMIT ORDER MATCHING

export async function limitOrder(req: Request, res: Response) {
    const userId = "7dda8668-3247-4111-884c-ec8092035851";
    const { ikey, symbol, price, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !price || !side || !quantity || !leverage) { return res.status(404).json({ success: false, message: "missing required fields !" }) }

    try {
        check(res, ikey, userId, "limitOrder");
        const orderCost = Number(quantity) * (Number(price) / Number(leverage));

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

        console.log(`{p:${price}, oc:${orderCost}, avb:${availableBalance}`);

        if (!availableBalance) {
            return res.status(404).json({ success: false, message: "Available balance not found." })
        }

        const hasBalance = Number(availableBalance) >= Number(orderCost) ? true : false

        if (!hasBalance) {
            return res.status(404).json({ success: false, message: "Insufficient balance." })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`
            const updateBalanceResult = await tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { decrement: Number(orderCost) }, lockedBalance: { increment: Number(orderCost) } }
            })
            const transactionResult = await tx.order.create({
                data: {
                    userId, symbol, side, quantity, leverage, openPrice: price, closePrice: null, tp: null, sl: null,
                    status: OrderStatus.PENDING
                }
            })

            return { transactionResult, availableBalance: updateBalanceResult.availableBalance, lockedBalance: updateBalanceResult.lockedBalance };
        })
        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to create order !')
            return res.status(404).json({ success: false, message: "failed to create order !" })
        }
        
        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);
        await redis.set(`lockedBalance:${userId}`, String(result.lockedBalance), "EX", 3600);

        const { orderId, openPrice, status, createdAt } = result.transactionResult;

        // PUSHING ORDER INTO REDIS FOR : LIMIT-ORDER-MATCHING ()
        await redis.lpush("limitOrders", JSON.stringify({orderId, userId, symbol, side, price}));

        // IDEM RESPONSE SET
        await redis.set(`limitOrder${ikey}`, JSON.stringify({ orderId, price: openPrice, createdAt }))

        // IDEM RESPONSE SET (DATABASE)
        await setIdemResponse(ikey, userId, JSON.stringify({ orderId, price: openPrice, createdAt }))
        console.log("---------------complete");
        return res.status(201).json({ success: true, data: { orderId, price: openPrice, status, createdAt } })


    } catch (error: any) {
        console.log("limitOrder ERROR : ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`)
        console.log("---------------error");
        return res.status(500).json({ success: false, message: "server error !" })
    }
}