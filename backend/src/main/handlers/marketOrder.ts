import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { OrderStatus } from '../../type/type.js';


export async function marketOrder(req: Request, res: Response) {
    const userId = "101";
    const { ikey, symbol, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !side || !quantity || !leverage) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    // IDEMPOTENCY-CHECK
    const isNewRequest = await redis.set(`marketOrder${ikey}`, "LOCKED", "NX", "EX", 300);
    if (!isNewRequest) {
        const response = await redis.get(`marketOrder${ikey}`)
        if (response !== "LOCKED") {
            res.status(200).json({ success: true, data: JSON.parse(response) })
        } else {
            res.status(400).json({ success: false, message: "duplicate request !" })
        }
    }
    try {
        const livePrice = Number(await redis.get(`LIVE-PRICE-${symbol}`));
        const availableBalance = Number(await redis.get(`AVAILABLE-BALANCE-${userId}`));
        const orderCost = quantity * (livePrice / leverage)

        const hasBalance = availableBalance >= orderCost ? true : false
        if (!hasBalance) {
            res.status(404).json({ success: false, message: "insufficient balance !" })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            tx.user.$queryRaw(`SELECT * FROM User WHERE userId = ${userId} FOR UPDATE`)
            tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { decrement: orderCost }, lockedBalance: { increment: orderCost } }
            })
            tx.ikey.create({
                data: { ikey, userId, response: "LOCKED" }
            })

            return tx.order.create({
                data: {
                    userId, symbol, side, quantity, leverage, openPrice: livePrice, closePrice: null, tp: null, sl: null,
                    status: OrderStatus.EXECUTION
                }
            })
        })

        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to create order !')
            res.status(404).json({ success: false, message: "failed to create order !" })
        }

        const { orderId, openPrice, status, createdAt } = result;

        await redis.set(`marketOrder${ikey}`, JSON.stringify({ orderId, price: openPrice, createdAt }))

        await setIdemResponse(ikey, userId, JSON.stringify({ orderId, price: openPrice, createdAt }))

        res.status(201).json({ success: true, data: { orderId, price: openPrice, status, createdAt } })

    } catch (error: any) {
        console.log("marketOrder ERROR : ", error.message);
        await redis.set(`marketOrder${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`)
        res.status(500).json({ success: false, message: "server error !" })
    }
} 