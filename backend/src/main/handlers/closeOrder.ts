import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { OrderStatus, TransactionType } from '../../generated/prisma/enums.js';
import { SUBJECTS } from '../../type/type.js';
import { getClosePrice } from '../util/livePrice.js';
import { add, div, mul, sub } from '../util/money.js';

type engineResult = {success:boolean, id:string, closePrice:string}

export async function closeOrder(req: Request, res: Response) {
    console.log("\n\n> /api/close (api call)");

    const userId = req.userId;
    const { orderId } = req.body;
    if (!userId || !orderId) { return res.status(404).json({ success: false, message: "Missing required fields !" }) }

    try {
        const order = await prisma.order.findFirst({
            where: { orderId, userId }
        })

        if (!order) {
            return res.status(404).json({ success: false, messge: "Order not found." })
        }
        
        const id = crypto.randomUUID()
        
        let closePrice: string | null = null;

        try {
            const engineResult: engineResult = await natsRequest<engineResult>(SUBJECTS.ORDER_CLOSE, { id, symbol: order.symbol }, 1500);
            if (engineResult.success) {
                closePrice = engineResult.closePrice;
            }
        } catch (error: any) {
            console.log("\n> [ERROR] (closeOrder.ts) : engine close round-trip failed, falling back to cached price :", error.message);
        }

        if (closePrice === null) {
            closePrice = await getClosePrice(order.symbol);
        }

        if (closePrice === null) {
            return res.status(503).json({ success: false, message: "Close price unavailable. Please retry." })
        }

        const pnl = order.side === "BUY"
            ? sub(closePrice, order.openPrice ?? 0)
            : sub(order.openPrice ?? 0, closePrice);

        const releaseBalance = mul(order.quantity ?? 0, div(order.openPrice ?? 0, order.leverage))
        
        console.log("\n> releaseBalance :", releaseBalance);

        const result = await prisma.$transaction(async (tx: any) => {
            if (pnl.gt(0)) {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.PROFIT, amount: pnl.toNumber()
                    }
                })
            } else {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.LOSS, amount: pnl.toNumber()
                    }
                });
            }

            const balanceIncrement = add(releaseBalance, pnl)

            await tx.user.update({
                where: { userId },
                data: { balance: { increment: balanceIncrement.toNumber() } }
            });

            await tx.$queryRaw`SELECT * FROM "Order" WHERE "userId" = ${userId} FOR UPDATE`
            const orderResult = await tx.order.update({
                where: { orderId, userId },
                data: {
                    status: OrderStatus.COMPLETED, closePrice,
                },
                select: { orderId: true, status: true, closePrice: true }
            })

            const balanceResult = await tx.user.findUnique({ where: { userId }, select: { balance: true } })

            return { orderId: orderResult.orderId, status: orderResult.status, closePrice: orderResult.closePrice, balance: balanceResult?.balance }
        }, { maxWait: 5000, timeout: 10000 })

        if (!result) {
            res.status(400).json({success : false, message:"failed to close order."})
        }

        const { status } = result

        await setBalance(userId, Number(result.balance))
        
        // await redis.lpush("orderToCancel", JSON.stringify({orderId, side:order.side })) 

        console.log("\n> order closed : ", { success: true, data: { success: true, data: { orderId, status, closePrice, message: "Order close successfully." } } });
        
        return res.status(200).json({ success: true, data: { success: true, data: { orderId, status, closePrice, message: "Order close successfully." } } })

    } catch (error: any) {
        console.log("ERROR (closeOrder.ts) : ", error.message);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}

async function setBalance(userId: string, balance:number) {
    await redis.set(`balance:${userId}`, String(balance), "EX", 3600);
    console.log("\n> balance :", balance);
}
