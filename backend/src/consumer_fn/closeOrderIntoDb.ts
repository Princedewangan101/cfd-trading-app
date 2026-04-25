import { prisma } from "../configs/db.js"
import { redis } from "../configs/redis.js"
import { LedgerTransactionType, OrderStatus, WS_EVENT_TYPES } from "../../types.js"
import producer from "../kafka/producerInstance.js"




export async function closeOrderIntoDb(data: any) {
    const { id, idemKey, userId, orderId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, netProfitorLoss, task, timestamp } = data;

    try {
        if (!id || !idemKey || !userId || !orderId || !pair || !quantity || !openPrice || !closePrice || !pnl || !type || !createdAt || !netProfitorLoss || !task || !timestamp) {
            throw new Error("MISSING REQUIRED FIELDS")
        }

        const result = await prisma.$transaction(async (tx) => {
            // BALANCE WILL GET BY ADDING ALL THE TRANSACTION AMOUNT OF LEDGER. (FOR SPECIFIC USER)
            await tx.ledger.create({

                data: {
                    userId: Number(userId),
                    transactionAmount: Number(netProfitorLoss), // LOSS WILL ALWAYS IN NEG NO NEED TO ADD MINUS.
                    ledgerTransactionType: netProfitorLoss > 0 ? LedgerTransactionType.PROFIT : LedgerTransactionType.LOSS
                }
            })

            await redis.zrem(`ORDERS:${type}:${pair}`, orderId);
            await redis.set(`ORDER_STATUS_BY_ORDER_ID:${orderId}`, OrderStatus.CLOSED);

            const balanceResult = await tx.ledger.aggregate({
                where: { userId: Number(userId) },
                _sum: { transactionAmount: true }
            });
            if (!balanceResult) throw new Error(`BALANCE FOR USER-ID ${userId} NOT FOUND`);

            redis.set(`${userId}_BALANCE :`, balanceResult._sum.transactionAmount ? balanceResult._sum.transactionAmount : 0)

            await tx.$executeRaw`
                    UPDATE Order 
                    SET closePrice = ${closePrice}, pnl = ${pnl} 
                    WHERE orderId = ${orderId}
            `;

            return { balanceResult }
        })
        if (!result) {
            throw new Error("FAILED TO CREATE ORDER")
        }

        // FOR LIVE BALANCE UPDATE
        await producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{
                value: JSON.stringify({
                    event: WS_EVENT_TYPES.BALANCE_UPDATE,
                    value: {
                        userId_for_balance: userId,
                        newBalance: result.balanceResult._sum.transactionAmount,
                        change: Number(netProfitorLoss),
                        reason: "PROFIT_OR_LOSS"
                    },
                    from: "backend-db-save"
                })
            }]
        });


        const value = { id, idemKey, userId, orderId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, netProfitorLoss, task, timestamp }
        // FOR CLOSE TRADE EXECUTED MSG
        await producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{
                value: JSON.stringify({
                    value,
                    event: WS_EVENT_TYPES.CLOSE_TRADE_EXECUTED,
                    from: "backend-db-save"
                })
            }]
        });

        return {
            id, idemKey, userId, orderId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, netProfitorLoss, task, timestamp
        }

    } catch (error: any) {
        console.log('ERROR : ', error.message);
        await producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{
                value: JSON.stringify({
                    value: { userId_of_failed_trade: userId, errorMessage: error.message },
                    event: WS_EVENT_TYPES.CLOSE_TRADE_FAILED,
                    from: "backend-db-save"
                })
            }]
        });
    }
}

