import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { OrderStatus } from '../../generated/prisma/enums.js';
import { SUBJECTS } from '@cfd/contracts';
import { getClosePrice } from '../util/livePrice.js';
import Decimal from 'decimal.js';
import { add, sub } from '../util/money.js';
import { settleOrder } from '../services/orderService.js';

type engineResult = {success:boolean, id:string, closePrice:string}

export async function closeAllOrders(req: Request, res: Response) {
    console.log("\n\n> /api/close-all (api call)");

    const userId = req.userId;
    if (!userId) {
        return res.status(400).json({ success: false, message: "Missing required fields !" });
    }

    try {
        const openOrders = await prisma.order.findMany({
            where: { userId, status: OrderStatus.RUNNING }
        });

        if (openOrders.length === 0) {
            return res.status(200).json({ success: true, data: { success: true, message: "No open orders to close." } });
        }

        const closedOrders: { orderId: string, closePrice: string, pnl: Decimal }[] = [];
        let totalPnl = new Decimal(0);

        for (const order of openOrders) {
            const id = crypto.randomUUID();

            let closePrice: string | null = null;

            try {
                const engineResult: engineResult = await natsRequest<engineResult>(
                    SUBJECTS.ORDER_CLOSE,
                    { id, orderId: order.orderId, symbol: order.symbol },
                    1500
                );
                if (engineResult.success) {
                    closePrice = engineResult.closePrice;
                }
            } catch (error: any) {
                req.log.warn({ err: error, symbol: order.symbol }, "engine close round-trip failed, falling back to cached price");
            }

            if (closePrice === null) {
                closePrice = await getClosePrice(order.symbol);
            }

            if (closePrice === null) {
                return res.status(503).json({ success: false, message: `Close price unavailable for ${order.symbol}. Please retry.` })
            }

            const pnl = order.side === "BUY"
                ? sub(closePrice, order.openPrice ?? 0)
                : sub(order.openPrice ?? 0, closePrice);

            closedOrders.push({ orderId: order.orderId, closePrice, pnl });
            totalPnl = add(totalPnl, pnl);
        }

        const result = await prisma.$transaction(async (tx: any) => {
            for (const closed of closedOrders) {
                const order = openOrders.find((o) => o.orderId === closed.orderId)!;

                await settleOrder(tx, {
                    orderId: closed.orderId, userId, side: order.side, closePrice: closed.closePrice,
                    openPrice: order.openPrice ?? 0, quantity: order.quantity ?? 0, leverage: order.leverage,
                });

                await tx.order.update({
                    where: { orderId: closed.orderId, userId },
                    data: { status: OrderStatus.COMPLETED, closePrice: closed.closePrice }
                });
            }

            const balanceResult = await tx.user.findUnique({ where: { userId }, select: { balance: true } })
            return balanceResult?.balance
        }, { maxWait: 5000, timeout: 10000 })

        await setBalance(userId, Number(result))

        console.log("\n> orders closed : ", { success: true, data: { closedCount: closedOrders.length, totalPnl, message: "All orders closed successfully." } });

        return res.status(200).json({
            success: true,
            data: { success: true, data: { closedCount: closedOrders.length, totalPnl: totalPnl.toNumber(), message: "All orders closed successfully." } }
        })

    } catch (error: any) {
        req.log.error({ err: error }, "failed to close all orders");
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}

async function setBalance(userId: string, balance:number) {
    await redis.set(`balance:${userId}`, String(balance), "EX", 3600);
    console.log("\n> balance :", balance);
}
