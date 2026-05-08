import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { OrderStatus, TransactionType } from '../../type/type.js';


export async function cancelOrder(req: Request, res: Response) {
    const userId = "101";
    const { ikey, orderId } = req.body;
    if (!ikey || !userId || !orderId) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    // IDEMPOTENCY-CHECK
    const isNewRequest = await redis.set(`withdraw${ikey}`, "LOCKED", "NX", "EX", 300);
    if (!isNewRequest) {
        const response = await redis.get(`withdraw${ikey}`)
        if (response !== "LOCKED") {
            res.status(200).json({ success: true, data: JSON.parse(response) })
        } else {
            res.status(400).json({ success: false, message: "duplicate request !" })
        }
    }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const order = await tx.order.findUnique({
                where: { orderId, userId }
            })
            const livePrice = (Number(await redis.get(`LIVE-PRICE-${order.symbol}`))) * 100

            let pnl: number;

            if (order.side === "BUY") {
                pnl = (livePrice - order.openPrice)
            } else { pnl = (order.openPrice - livePrice) }

            const releaseBalance = order.quantity * order.openPrice / order.leverage
            if (pnl > 0) {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.PROFIT, amount: pnl
                    }
                })
                // transfered the lock bal into available bal
                const lockBalance = await redis.decrby(`LOCK-BALANCE-${userId}`, releaseBalance);
                await redis.incby(`AVAILABLE-BALANCE-${userId}`, releaseBalance);

                // adding pnl to ava bal & calcu total bal & saving in redis
                const availableBalance = await redis.incby(`AVAILABLE-BALANCE-${userId}`, pnl);
                const totalBalance = availableBalance + lockBalance
                await redis.set(`TOTAL-BALANCE-${userId}`, totalBalance);

            } else {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.LOSS, amount: pnl
                    }
                })
                const islossGreaterThanReleaseBalance = releaseBalance < pnl ? true : false;

                if (islossGreaterThanReleaseBalance) {
                    const gap = releaseBalance - pnl
                    await redis.decrby(`LOCK-BALANCE-${userId}`, gap);
                    await redis.incby(`AVAILABLE-BALANCE-${userId}`, gap);
                }
                const lockBalance = await redis.decrby(`LOCK-BALANCE-${userId}`, pnl);
                const availableBalance = await redis.get(`AVAILABLE-BALANCE-${userId}`);
                const totalBalance = availableBalance + lockBalance;
                await redis.set(`TOTAL-BALANCE-${userId}`, totalBalance);
            }

            tx.order.$queryRaw(`SELECT * FROM Order WHERE userId = ${userId} FOR UPDATE`)
            return tx.order.update({
                where: userId, data: {
                    status: OrderStatus.COMPLETED, closePrice: livePrice,
                },
                select: { orderId: true, status: true, closePrice: true }
            })

        })
        setIdemResponse(ikey, userId, JSON.stringify({ orderId: result.orderId, status: result.status, closePrice: result.status }))
        return res.status(200).json({ success: true, data: {} })
    } catch (error: any) {
        console.log("withdraw ERROR : ", error.message);
        await redis.set(`withdraw${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`);
        res.status(500).json({ success: false, message: "server error !" });
    }
}