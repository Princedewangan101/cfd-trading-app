import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { OrderStatus, TransactionType } from '../../generated/prisma/client.js';



export async function closeOrder(req: Request, res: Response) {
    const userId = "7dda8668-3247-4111-884c-ec8092035851";
    const { orderId } = req.body;
    if (!userId || !orderId) { res.status(404).json({ success: false, message: "Missing required fields !" }) }

    try {
        const order = await prisma.order.findFirst({
            where: { orderId, userId }
        })

        if (!order) {
            return res.status(404).json({ success: false, messge: "Order not found." })
        }

        const livePrice = await redis.get(`LIVE-PRICE-${order.symbol}`) || 100

        if (!livePrice) {
            return res.status(404).json({ success: false, messge: "Live price not found." })
        }

        let pnl: number;

        if (order.side === "BUY") {
            pnl = (Number(livePrice) - Number(order.openPrice))
        } else {
            pnl = (Number(order.openPrice) - Number(livePrice))
        }

        const releaseBalance: number = Number(order.quantity) * Number(order.openPrice) / Number(order.leverage)

        const result = await prisma.$transaction(async (tx: any) => {
            if (pnl > 0) {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.PROFIT, amount: pnl
                    }
                })

                const availableBalanceIncrement: number = releaseBalance + pnl

                await tx.user.update({
                    where: { userId },
                    data: { lockedBalance: { decrement: Number(releaseBalance) }, availableBalance: { increment: Number(availableBalanceIncrement) } }
                })

            } else {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.LOSS, amount: pnl
                    }
                });

                const islossGreaterThanReleaseBalance = releaseBalance < pnl ? true : false;

                if (islossGreaterThanReleaseBalance) {
                    const lossAmountOutOfLockBalance = pnl - releaseBalance

                    const result = await tx.user.update({
                        where: { userId },
                        data: { lockBalance: { decrement: Number(releaseBalance) }, availableBalance: { decrement: Number(lossAmountOutOfLockBalance) } }
                    });
                    await redis.set(`totalBalance:${userId}`, `${result.lockBalance + result.availableBalance}`);
                } else {
                    const restAmountOfTheLockBalanaceForThisTrade = releaseBalance - pnl

                    const result = await tx.user.update({
                        where: { userId },
                        data: { lockBalance: { decrement: Number(pnl) }, availableBalance: { increment: Number(restAmountOfTheLockBalanaceForThisTrade) } }
                    });
                    await redis.set(`totalBalance:${userId}`, `${Number(result.lockBalance) + Number(result.availableBalance)}`, "EX", 3600);
                }
            }

            await tx.$queryRaw`SELECT * FROM "Order" WHERE "userId" = ${userId} FOR UPDATE`
            const result = await tx.order.update({
                where: { orderId, userId },
                data: {
                    status: OrderStatus.COMPLETED, closePrice: livePrice,
                },
                select: { orderId: true, status: true, closePrice: true }
            })
            return result
        },{maxWait:5000, timeout:10000})

        const  {status, closePrice} = result

        return res.status(200).json({ success: true, data: { success: true, data: {orderId, status, closePrice, messaage:"Order close successfully."} } })
    } catch (error: any) {
        console.log("ERROR (closeOrder.ts) : ", error.message);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}