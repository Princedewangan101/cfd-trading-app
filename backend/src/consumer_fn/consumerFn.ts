import { prisma } from "../configs/db.js"
import { redis } from "../configs/redis.js"
import { LedgerTransactionType, OrderStatus, WS_EVENT_TYPES } from "../../types.js"
import producer from "../kafka/producerInstance.js"


export async function addOrderIntoDb(data: any) {
    const { id, userId, pair, lot, openPrice, type, closePrice, requiredBalance, requiredBalanceWithFee, Fee, pnl, task, timestamp } = data
    try {
        if (!id || !userId || !pair || !lot || !openPrice || !type || closePrice !== undefined || requiredBalance || Fee || requiredBalanceWithFee || !pnl || !task || !timestamp) {
            throw new Error("MISSING REQUIRED FIELDS")
        }

        const result = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    userId: Number(userId),
                    pair: String(pair),
                    lot: Number(lot),
                    openPrice: Number(openPrice),
                    closePrice: closePrice !== "NO-CLOSING-PRICE" ? Number(closePrice) : null,
                    pnl: Number(pnl),
                    type
                }
            })

            await tx.ledger.create({
                data: {
                    userId: Number(userId),
                    transactionAmount: -Math.abs(Number(Fee)),
                    ledgerTransactionType: LedgerTransactionType.FEE_DEDUCTION
                }
            })

            const balanceResult = await tx.ledger.aggregate({
                where: { userId: Number(userId) },
                _sum: { transactionAmount: true }
            });

            return { newOrder, balanceResult }
        })
        if (!result) {
            throw new Error("FAILED TO CREATE ORDER")
        }

        // FOR LIVE BALANCE UPDATE
        await producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{
                value: JSON.stringify({
                    userId: userId,
                    event: WS_EVENT_TYPES.BALANCE_UPDATE,
                    value: {
                        newBalance: result.balanceResult._sum.transactionAmount,
                        change: -Fee,
                        reason: "FEE_DEDUCTION"
                    },
                    from: "backend-db-save"
                })
            }]
        });

        // SET THE ORDER IN DISTRIBUTED IN MEMORY FOR MATCHING ENGINE:
        // await redis.zadd(`ORDERS:${type}:${pair}`, SCORE, MEMBER);
        await redis.zadd(`ORDERS:${type}:${pair}`, openPrice, result.newOrder.orderId);
        await redis.set(`ORDER_STATUS_BY_ORDER_ID:${result.newOrder.orderId}`, OrderStatus.IN_MEMORY);

        // FOR LIVE "TRADE EXECUTED" MSG
        const value = { id, userId, pair, lot, openPrice, type, closePrice, requiredBalance, requiredBalanceWithFee, Fee, pnl, task, timestamp }
        await producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{
                value: JSON.stringify({
                    value,
                    event: WS_EVENT_TYPES.TRADE_EXECUTED,
                    from: "backend-db-save"
                })
            }]
        });

        return {
            id, order: result.newOrder.orderId, userId, pair, lot, openPrice, type, closePrice, pnl, task, timestamp
        }
    } catch (error: any) {
        console.log('ERROR : ', error.message);
        await producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{
                value: JSON.stringify({
                    value: { userId_of_failed_trade: userId, errorMessage: error.message },
                    event: WS_EVENT_TYPES.TRADE_FAILED,
                    from: "backend-db-save"
                })
            }]
        });
    }
}


export async function closeOrderIntoDb(data: any) {
    const { id, idemKey, userId, orderId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, netProfitorLoss, task, timestamp } = data;

    try {
        if (!id || !idemKey || !userId || !orderId || !pair || !quantity || !openPrice || !closePrice || !pnl || !type || !createdAt || !netProfitorLoss || !task || !timestamp) {
            throw new Error("MISSING REQUIRED FIELDS")
        }

        const result = await prisma.$transaction(async (tx) => {
            // BALANCE WILL GET BY ADDING ALL THE TRANSACTION AMOUNT OF LEDGER. (FOR SPECIFIC USER)
            await tx.ledger.create({
                userId: Number(userId),
                transactionAmount: Number(netProfitorLoss), // LOSS WILL ALWAYS IN NEG NO NEED TO ADD MINUS.
                ledgerTransactionType: netProfitorLoss > 0 ? LedgerTransactionType.PROFIT : LedgerTransactionType.LOSS
            })

            await redis.zrem(`ORDERS:${type}:${pair}`, orderId);
            await redis.set(`ORDER_STATUS_BY_ORDER_ID:${orderId}`, OrderStatus.CLOSED);

            const balanceResult = await tx.ledger.aggregate({
                where: { userId: Number(userId) },
                _sum: { transactionAmount: true }
            });

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
                    userId: userId,
                    event: WS_EVENT_TYPES.BALANCE_UPDATE,
                    value: {
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




// const bestSell = await redis.zrange(`ORDERS:SELL:BTC`, 0, 0, "WITHSCORES");
// const bestBuy = await redis.zrevrange(`ORDERS:BUY:BTC`, 0, 0, "WITHSCORES");
