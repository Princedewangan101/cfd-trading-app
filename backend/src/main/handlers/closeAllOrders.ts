import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { OrderStatus, TransactionType } from '../../generated/prisma/enums.js';
import { SUBJECTS } from '../../type/type.js';
import { getClosePrice } from '../util/livePrice.js';

type engineResult = {success:boolean, id:string, closePrice:string}

export async function closeAllOrders(req: Request, res: Response) {
    console.log("\n\n> /api/close-all (api call)");

    const userId = req.userId;
    if (!userId) {
        return res.status(404).json({ success: false, message: "Missing required fields !" });
    }

    try {
        const openOrders = await prisma.order.findMany({
            where: { userId, status: OrderStatus.RUNNING }
        });

        if (openOrders.length === 0) {
            return res.status(200).json({ success: true, data: { success: true, message: "No open orders to close." } });
        }

        const closedOrders: { orderId: string, closePrice: string, pnl: number }[] = [];
        let totalPnl = 0;

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
                console.log("\n> [ERROR] (closeAllOrders.ts) : engine close round-trip failed, falling back to cached price :", error.message);
            }

            if (closePrice === null) {
                closePrice = await getClosePrice(order.symbol);
            }

            if (closePrice === null) {
                return res.status(503).json({ success: false, message: `Close price unavailable for ${order.symbol}. Please retry.` })
            }

            const pnl = order.side === "BUY"
                ? (Number(closePrice) - Number(order.openPrice))
                : (Number(order.openPrice) - Number(closePrice));

            closedOrders.push({ orderId: order.orderId, closePrice, pnl });
            totalPnl += pnl;
        }

        const result = await prisma.$transaction(async (tx: any) => {
            for (const closed of closedOrders) {
                const order = openOrders.find((o) => o.orderId === closed.orderId);

                if (closed.pnl > 0) {
                    await tx.transaction.create({
                        data: { orderId: closed.orderId, userId, type: TransactionType.PROFIT, amount: closed.pnl }
                    })
                } else {
                    await tx.transaction.create({
                        data: { orderId: closed.orderId, userId, type: TransactionType.LOSS, amount: closed.pnl }
                    });
                }

                const releaseBalance: number = Number(order?.quantity) * Number(order?.openPrice) / Number(order?.leverage)

                await tx.user.update({
                    where: { userId },
                    data: { balance: { increment: Number(releaseBalance) + Number(closed.pnl) } }
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
            data: { success: true, data: { closedCount: closedOrders.length, totalPnl, message: "All orders closed successfully." } }
        })

    } catch (error: any) {
        console.log("ERROR (closeAllOrders.ts) : ", error.message);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}

async function setBalance(userId: string, balance:number) {
    await redis.set(`balance:${userId}`, String(balance), "EX", 3600);
    console.log("\n> balance :", balance);
}
