import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { OrderStatus } from '../../type/type.js';
import { IdempotencyCheck } from '../util/IdempotencyCheck.js';

// 1. IDEMPOTENCY CHECK.
// 2. CHECKED THAT USER HAS ENOUGH AVAILABLE BALANCE OR NOT (IF AVAILABLE BALANCE IS NOT IN CACHE THEN, WE FETCH FROM DB AND USE IT, CACHE IT).
// 3. ATOMIC TRANSACTION : DECREMENT AVAILABLE BALANCE, INCREMENT LOCK BALANCE IN USER TABLE, RECORD TRANSACTION, CREATE IKEY RECORD.
// 4. PUSH ORDER INTO REDIS SORTED SET FOR LIMIT ORDER MATCHING

export async function limitOrder(req: Request, res: Response) {
    const userId = "101";
    const { ikey, symbol, price, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !price || !side || !quantity || !leverage) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    const isNewRequest = await redis.set(`limitOrder${ikey}`, "LOCKED", "EX", 300, "NX");
    IdempotencyCheck(res, "limitOrder", isNewRequest, ikey, userId);

    try {
        const orderCost = Number(quantity) * (Number(price) / Number(leverage));

        let availableBalance;

        const isAvailableBalanceInCache = await redis.get(`availableBalance:${userId}`)
        isAvailableBalanceInCache ?
            availableBalance = Number(isAvailableBalanceInCache)
            :
            availableBalance = Number(await prisma.user.findUnique({ where: { userId }, select: { availableBalance: true } }))

        const hasBalance = availableBalance >= orderCost ? true : false
        if (!hasBalance) {
            res.status(404).json({ success: false, message: "insufficient balance !" })
        }

        const result: { orderId: string, openPrice: number, status: string, createdAt: Date } = await prisma.$transaction(async (tx: any) => {
            await tx.user.$queryRaw(`SELECT * FROM User WHERE userId = ${userId} FOR UPDATE`)
            await tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { decrement: orderCost }, lockedBalance: { increment: orderCost } }
            })
            const transactionResult = await tx.order.create({
                data: {
                    userId, symbol, side, quantity, leverage, openPrice: price, closePrice: null, tp: null, sl: null,
                    status: OrderStatus.PENDING
                }
            })
            await tx.ikey.create({
                data: { ikey, userId, response: JSON.stringify({ transactionResult }) }
            })
            return transactionResult;
        })
        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to create order !')
            res.status(404).json({ success: false, message: "failed to create order !" })
        }
        const { orderId, openPrice, status, createdAt } = result;

        // PUSHING ORDER INTO REDIS FOR : LIMIT-ORDER-MATCHING ()
        await redis.zadd(`${symbol}-${side}`, `${openPrice}`, `${orderId},${userId}`)

        // IDEM RESPONSE SET
        await redis.set(`limitOrder${ikey}`, JSON.stringify({ orderId, price: openPrice, createdAt }))

        // IDEM RESPONSE SET (DATABASE)
        await setIdemResponse(ikey, userId, JSON.stringify({ orderId, price: openPrice, createdAt }))

        res.status(201).json({ success: true, data: { orderId, price: openPrice, status, createdAt } })


    } catch (error: any) {
        console.log("limitOrder ERROR : ", error.message);
        await redis.set(`limitOrder${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`)
        res.status(500).json({ success: false, message: "server error !" })
    }
}