import { type Request, type Response } from 'express';
import Decimal from 'decimal.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { getLivePrice } from '../util/livePrice.js';
import { OrderStatus } from '../../generated/prisma/client.js';
import { SUBJECTS } from '@cfd/contracts';
import { applyBalanceDelta, getCachedBalance, setBalanceCache } from '../services/balanceService.js';
import { computeOrderCostWithFee, createOrderTx } from '../services/orderService.js';

export async function marketOrder(req: Request, res: Response) {
    console.log("\n\n>> /api/market (api call)");

    const userId = req.userId;

    const { ikey, symbol, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !side || !quantity || !leverage) {
        console.log("\n> ---------- ERROR : missing required fields !");
        return res.status(404).json({ success: false, message: "missing required fields !" })
    }

    try {
        const livePrice = await getLivePrice(symbol);
        if (livePrice === null) {
            return res.status(404).json({ success: false, message: "Live price not found." })
        }

        const { orderCost, fee, orderCostWithFee } = computeOrderCostWithFee(quantity, livePrice, leverage);

        const balance = await getCachedBalance(userId);
        if (balance === null) {
            return res.status(404).json({ success: false, message: "Failed to fetch balance." })
        }

        console.log(`\n > {lp:${livePrice}, oc:${orderCost}, fee:${fee}, bal:${balance}`);

        if (new Decimal(balance).lt(orderCostWithFee)) {
            return res.status(404).json({ success: false, message: "Insufficient balance." })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            const newBalance = await applyBalanceDelta(tx, userId, -orderCostWithFee.toNumber());
            const transactionResult = await createOrderTx(tx, {
                userId, symbol, side, quantity, leverage,
                openPrice: livePrice, status: OrderStatus.RUNNING
            });
            return { transactionResult, balance: newBalance };
        }, { maxWait: 5000, timeout: 10000 })

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to create order.')
            return res.status(404).json({ success: false, message: "Failed to create order." })
        }

        await setBalanceCache(userId, result.balance);

        console.log("\n> balance :", result.balance);

        const { orderId, openPrice, status, createdAt } = result.transactionResult;

        // PUSH ORDER INTO ENGINE AS A LIMIT ORDER AT THE LIVE PRICE SO THE
        // ENGINE TRACKS IT IN MEMORY (MODIFY/CLOSE/TP-SL OPERATE ON IT UNIFORMLY).
        try {
            await natsRequest(SUBJECTS.LIMIT_ORDER_SUBMIT, { orderId, userId, symbol, side, price: livePrice, quantity, leverage });
        } catch (error: any) {
            console.log("\n> [WARN] (marketOrder.ts) : failed to push market order to engine, order remains live :", error.message);
        }

        await setIdemResponse(ikey, userId, JSON.stringify({ orderId, price: openPrice, createdAt }))
        console.log("--------------- complete");
        return res.status(200).json({ success: true, data: { orderId, price: openPrice, status, createdAt } })

    } catch (error: any) {
        console.log("ERROR (marketOrder) : ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`)
        console.log("--------------- error");
        return res.status(500).json({ success: false, message: `Server error !` })
    }
} 
