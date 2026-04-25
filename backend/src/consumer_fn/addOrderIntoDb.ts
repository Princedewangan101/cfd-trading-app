import { prisma } from "../configs/db.js"
import { redis } from "../configs/redis.js"
import { LedgerTransactionType, OrderStatus, WS_EVENT_TYPES,  } from "../../types.js"
import producer from "../kafka/producerInstance.js"

const orders = new Map<string, Order>();

export async function addOrderIntoDb(data: any) {
    const { id, userId, pair, quantity, openPrice, type, closePrice, requiredBalance, requiredBalanceWithFee, Fee, liquidatePrice, pnl, task, timestamp } = data
    try {
        if (!id || !userId || !pair || !quantity || !openPrice || !type || closePrice !== undefined || requiredBalance || Fee || requiredBalanceWithFee || !pnl || !task || !timestamp) {
            throw new Error("MISSING REQUIRED FIELDS")
        }

        const result = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    userId: Number(userId),
                    pair: String(pair),
                    quantity: Number(quantity),
                    openPrice: Number(openPrice),
                    closePrice: closePrice !== "NO-CLOSING-PRICE" ? Number(closePrice) : null,
                    liquidationPrice: Number(liquidatePrice),
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
            if (!balanceResult) throw new Error(`BALANCE FOR USER-ID ${userId} NOT FOUND`);

            redis.set(`${userId}_BALANCE :`, balanceResult._sum.transactionAmount ? balanceResult._sum.transactionAmount : 0)

            return { newOrder, balanceResult }
        })
        if (!result) {
            throw new Error("FAILED TO CREATE ORDER")
        }

        // EVENT FOR LIVE BALANCE UPDATE
        await producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{
                value: JSON.stringify({
                    event: WS_EVENT_TYPES.BALANCE_UPDATE,
                    value: {
                        userId_for_balance: userId,
                        newBalance: result.balanceResult._sum.transactionAmount,
                        change: -Fee,
                        reason: "FEE_DEDUCTION"
                    },
                    from: "backend-db-save"
                })
            }]
        });

        const orderObj = {
            id, userId, quantity, pair, openPrice, type, timestamp: Date.now()
        }
        orders.set(`ORDER-ID:${result.newOrder.orderId}`, orderObj)




        // SET THE ORDER IN DISTRIBUTED IN MEMORY FOR MATCHING ENGINE:
        // await redis.zadd(`ORDERS:${type}:${pair}`, SCORE, MEMBER);
        await redis.zadd(`ORDERS:${type}:${pair}`, openPrice, result.newOrder.orderId);

        await redis.set(`ORDER_STATUS_BY_ORDER_ID:${result.newOrder.orderId}`, OrderStatus.IN_MEMORY);

        // FOR LIVE "TRADE EXECUTED" MSG
        const value = { id, userId, pair, quantity, openPrice, type, closePrice, requiredBalance, requiredBalanceWithFee, Fee, pnl, task, timestamp }
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
            id, order: result.newOrder.orderId, userId, pair, quantity, openPrice, type, closePrice, pnl, task, timestamp
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




// const bestSell = await redis.zrange(`ORDERS:SELL:BTC`, 0, 0, "WITHSCORES");
// const bestBuy = await redis.zrevrange(`ORDERS:BUY:BTC`, 0, 0, "WITHSCORES");
