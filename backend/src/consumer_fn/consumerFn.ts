
import { prisma } from "../configs/db.js"
import { redis } from "../configs/redis.js"
import { LedgerTransactionType, OrderStatus } from "../../types.js"




export async function addOrderIntoDb(data: any) {

    const { id, userId, pair, lot, openPrice, type, closePrice, requiredBalance, requiredBalanceWithFee, Fee, pnl, task, timestamp } = data

    if (!id || !userId || !pair || !lot || !openPrice || !type || closePrice !== undefined || requiredBalance || Fee || requiredBalanceWithFee || !pnl || !task || !timestamp) {
        throw new Error("MISSING REQUIRED FIELDS")
    }

    const result = await prisma.$transaction(async (tx) => {
        await tx.order.create({
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
    })
    if (!result) {
        throw new Error("FAILED TO CREATE ORDER")
    }

    // SET THE ORDER IN DISTRIBUTED IN MEMORY FOR MATCHING ENGINE:
    // await redis.zadd(`ORDERS:${type}:${pair}`, SCORE, MEMBER);
    await redis.zadd(`ORDERS:${type}:${pair}`, openPrice, result.orderId);
    await redis.set(`ORDER_STATUS_BY_ORDER_ID:${result.orderId}`, OrderStatus.IN_MEMORY);

    return {
        id, order: result.orderId, userId, pair, lot, openPrice, type, closePrice, pnl, task, timestamp
    }

}

export async function closeOrderIntoDb(data: any) {
    const { id, idemKey, userId, orderId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, netProfitorLoss, task, timestamp } = data;

    if (!id || !idemKey || !userId || !orderId || !pair || !quantity || !openPrice || !closePrice || !pnl || !type || !createdAt || !netProfitorLoss || !task || !timestamp) {
        throw new Error("MISSING REQUIRED FIELDS")
    }

    const resultOfOrderId = await prisma.$transaction(async (tx) => {
        await tx.ledger.create({
            userId: Number(userId),
            transactionAmount: Number(netProfitorLoss),
            ledgerTransactionType: netProfitorLoss > 0 ? LedgerTransactionType.PROFIT : LedgerTransactionType.LOSS
        })

        await redis.zrem(`ORDERS:${resultOfOrderId.type}:${resultOfOrderId.pair}`, resultOfOrderId.orderId);
        await redis.set(`ORDER_STATUS_BY_ORDER_ID:${orderId}`, OrderStatus.CLOSED);

        return await tx.order.findUnique({
            where: {
                orderId: Number(orderId)
            }
        })
    })
    if (!resultOfOrderId) {
        throw new Error("FAILED TO CREATE ORDER")
    }


    return {
        id, idemKey, userId, orderId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, netProfitorLoss, task, timestamp
    }

}


//  closeTrade RECEIVE THESE DATA IN data{}
//  id, idemKey, userId, orderId,
//  task: TradeStatus.CLOSE_ORDER_INTO_DB_N_REDIS,
//  timestamp: Date.now()

// const bestSell = await redis.zrange(`ORDERS:SELL:BTC`, 0, 0, "WITHSCORES");
// const bestBuy = await redis.zrevrange(`ORDERS:BUY:BTC`, 0, 0, "WITHSCORES");
