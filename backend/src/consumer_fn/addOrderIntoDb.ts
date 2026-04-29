import { prisma } from "../configs/db.js"
import { redis } from "../configs/redis.js"
import { LedgerTransactionType, OrderStatus, WS_EVENT_TYPES, } from "../../types.js"
import producer from "../kafka/producerInstance.js"


export async function addOrderIntoDb(data: any) {
    const { id, idemKey, orderId, userId, pair, quantity, openPrice, type, closePrice, requiredBalance, requiredBalanceWithFee, Fee, liquidatePrice, pnl, task, timestamp } = data
    try {
        if (!id || !userId || !orderId || !pair || !quantity || !openPrice || !type || closePrice !== undefined || requiredBalance || Fee || requiredBalanceWithFee || !pnl || !task || !timestamp) {
            throw new Error("MISSING REQUIRED FIELDS")
        }

        const result = await prisma.$transaction(async (tx) => {

            const price = await redis.get(`cl${orderId}`)

            const newOrder = await tx.order.create({
                data: {
                    orderId: Number(orderId),
                    userId: Number(userId),
                    pair: String(pair),
                    quantity: Number(quantity),
                    openPrice: Number(openPrice),
                    closePrice: price ? Number(price.closePrice) : "NO_CLOSING_PRICE",
                    liquidationPrice: Number(liquidatePrice),
                    pnl: Number(pnl),
                    type
                }
            })

            // PERSIST IDEM KEY KEY TO PREVENT PERMANENT REPLAY ATTACK.
            await prisma.idemKey.create({
                data: {
                    idemKey: idemKey,
                    userId: Number(userId),
                    response: newOrder,
                }
            })
            await redis.set(`idem:${idemKey}`, JSON.stringify({
                idemKey: idemKey,
                userId: Number(userId),
                response: newOrder,
            }), 'EX', 3600);

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
            await prisma.idemKey.create({
                data: {
                    idemKey: idemKey,
                    userId: Number(userId),
                    response: "FAILED TO CREATE ORDER",
                }
            })
            await redis.set(`idem:${idemKey}`, JSON.stringify({
                idemKey: idemKey,
                userId: Number(userId),
                response: "FAILED TO CREATE ORDER",
            }), 'EX', 3600);
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

