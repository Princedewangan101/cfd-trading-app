import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { OrderStatus, TransactionType } from '../../generated/prisma/enums.js';
import { SUBJECTS } from '../../type/type.js';

type engineResult = {success:boolean, id:string, closePrice:string}

export async function closeOrder(req: Request, res: Response) {
    console.log("\n\n> /api/close (api call)");

    // const userId = req.userId;
    const userId = "72c62fec-64a7-4b7f-89b4-e0e0ad2c2a25";
    const { orderId } = req.body;
    if (!userId || !orderId) { res.status(404).json({ success: false, message: "Missing required fields !" }) }

    try {
        const order = await prisma.order.findFirst({
            where: { orderId, userId }
        })

        if (!order) {
            return res.status(404).json({ success: false, messge: "Order not found." })
        }
        
        const id = crypto.randomUUID()
        
        const engineResult: engineResult = await natsRequest<engineResult>(SUBJECTS.ORDER_CLOSE, { id, symbol: order.symbol }, 5000);
        if (!engineResult.success) {
            console.log("\n> engineResult :", engineResult);
            return res.status(400).json({success:false, message:"Failed to close order."})
        }
        console.log("\n> engineResult :", engineResult);
        
        let pnl: number;

        if (order.side === "BUY") {
            pnl = (Number(engineResult.closePrice) - Number(order.openPrice))
        } else {
            pnl = (Number(order.openPrice) - Number(engineResult.closePrice))
        }

        const releaseBalance: number = Number(order.quantity) * Number(order.openPrice) / Number(order.leverage)
        
        console.log("\n> releaseBalance :", releaseBalance);

        const result = await prisma.$transaction(async (tx: any) => {
            if (pnl > 0) {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.PROFIT, amount: pnl
                    }
                })
            } else {
                await tx.transaction.create({
                    data: {
                        orderId, userId, type: TransactionType.LOSS, amount: pnl
                    }
                });
            }

            const balanceIncrement: number = Number(releaseBalance) + Number(pnl)

            await tx.user.update({
                where: { userId },
                data: { balance: { increment: Number(balanceIncrement) } }
            });

            await tx.$queryRaw`SELECT * FROM "Order" WHERE "userId" = ${userId} FOR UPDATE`
            const orderResult = await tx.order.update({
                where: { orderId, userId },
                data: {
                    status: OrderStatus.COMPLETED, closePrice: engineResult.closePrice,
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

        console.log("\n> order closed : ", { success: true, data: { success: true, data: { orderId, status, closePrice:engineResult.closePrice, message: "Order close successfully." } } });
        
        return res.status(200).json({ success: true, data: { success: true, data: { orderId, status, closePrice:engineResult.closePrice, message: "Order close successfully." } } })

    } catch (error: any) {
        console.log("ERROR (closeOrder.ts) : ", error.message);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}

async function setBalance(userId: string, balance:number) {
    await redis.set(`balance:${userId}`, String(balance), "EX", 3600);
    console.log("\n> balance :", balance);
}
