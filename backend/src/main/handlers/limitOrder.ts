import { type Request, type Response } from 'express';
import Decimal from 'decimal.js';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { OrderStatus } from '../../generated/prisma/client.js';
import { SUBJECTS } from '@cfd/contracts';
import { applyBalanceDelta, getCachedBalance, setBalanceCache } from '../services/balanceService.js';
import { computeOrderCost, createOrderTx } from '../services/orderService.js';

export async function limitOrder(req: Request, res: Response) {
    console.log("\n\n>> /api/limit (api call)");

    const userId = req.userId;

    const { ikey, symbol, price, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !price || !side || !quantity || !leverage) {
        console.log("\n> ---------- ERROR : missing required fields !");
        return res.status(404).json({ success: false, message: "missing required fields !" })
    }

    try {
        const orderCost = computeOrderCost(quantity, price, leverage);

        const balance = await getCachedBalance(userId);
        if (balance === null) {
            return res.status(404).json({ success: false, message: "Failed to fetch balance." })
        }

        console.log(`\n> {p:${price}, oc:${orderCost}, bal:${balance}`);

        const hasBalance = new Decimal(balance).gte(orderCost)

        if (!hasBalance) {
            console.log("\n> ---------- ERROR : Insufficient balance.");
            return res.status(404).json({ success: false, message: "Insufficient balance." })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            const newBalance = await applyBalanceDelta(tx, userId, -orderCost.toNumber());
            const transactionResult = await createOrderTx(tx, {
                userId, symbol, side, quantity, leverage,
                openPrice: price, price, status: OrderStatus.PENDING
            });
            return { transactionResult, balance: newBalance };
        }, { maxWait: 5000, timeout: 10000 })

        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to create order !')
            return res.status(404).json({ success: false, message: "failed to create order !" })
        }

        await setBalanceCache(userId, result.balance);

        console.log("\n> balance :", result.balance);

        const { orderId, openPrice, status, createdAt } = result.transactionResult;

        // PUSHING ORDER INTO ENGINE VIA NATS FOR : LIMIT-ORDER-MATCHING ()
        await natsRequest(SUBJECTS.LIMIT_ORDER_SUBMIT, { orderId, userId, symbol, side, price, quantity, leverage });

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
