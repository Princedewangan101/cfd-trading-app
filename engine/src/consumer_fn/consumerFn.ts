
import { redis } from "../redis.js";
import { TradeStatus } from "../../types.js";
import producer from "../kafka/producer.js";


export async function openTrade(id: string, data: any) {
    try {
        if (!id || !data) throw new Error("ENGINE- OPENTRADE FN MISSING REQUIRED FIELDS !")

        const { userId, pair, quantity, openPrice, type, closePrice, pnl, task } = data;

        // TODO: HAVE TO MAKE A GET-BALANCE FROM CACHE.
        const userBalance = await getBalanceFromCache(userId);

        if (!openPrice) throw new Error("MISSING OPEN-PRICE");

        if (type === "BUY" || closePrice !== "NO-CLOSING-PRICE") {
            if (Number(openPrice) < Number(closePrice)) {
                throw new Error("INSUFFICIENT_FUNDS");
            }
        } else if (type === "SELL" || closePrice !== "NO-CLOSING-PRICE") {
            if (Number(openPrice) > Number(closePrice)) {
                throw new Error("INSUFFICIENT_FUNDS");
            }
        }

        const requiredBalance = Number(quantity) * Number(openPrice);
        const Fee = (requiredBalance * 2) / 100
        const requiredBalanceWithFee = requiredBalance + Fee

        if (userBalance < requiredBalance) throw new Error("INSUFFICIENT_FUNDS");

        const tradeData = {
            id, userId, pair, quantity, openPrice, closePrice, type, pnl, requiredBalance, requiredBalanceWithFee, Fee
            task: TradeStatus.ADD_ORDER_INTO_DB_N_REDIS,
            timestamp: Date.now()
        }
        await producer.send({
            topic: "trade-result",
            messages: [
                { value: JSON.stringify({ value: tradeData, from: "engine" }), partition: 0 }
            ]
        })

    } catch (error: any) {
        console.log("ERROR : ", error);
        throw new Error(error.message)
    }
}
//  openTrade RECEIVE THESE DATA IN data{}
//  task: "OPEN_TRADE",
//  idemKey,
//  userId,
//  pair,
//  quantity,
//  openPrice,
//  type,
//  pnl: pnl ? pnl : 0
//  closePrice: closePrice ? closePrice : "NO-CLOSING-PRICE", 

export async function closeTrade(id: string, data: any) {
    try {
        if (!id || !data) throw new Error("ENGINE- OPENTRADE FN MISSING REQUIRED FIELDS !")

        const { idemKey, orderId, userId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, task } = data;
        if (!id || !idemKey || !userId || !orderId || !task) throw new Error("ENGINE- OPENTRADE FN MISSING REQUIRED FIELDS !")

        // TODO: Realized PnL Calculation
        const netProfitorLoss = type === "BUY" ?
            Number(closePrice - openPrice) * Number(quantity)
            :
            Number(openPrice - closePrice) * Number(quantity)




        // TODO:  Balance Update (The Event)

        const tradeData = {
            id, idemKey, userId, orderId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, netProfitorLoss,
            task: TradeStatus.CLOSE_ORDER_INTO_DB_N_REDIS,
            timestamp: Date.now()
        }

        await producer.send({
            topic: "trade-result",
            messages: [
                { value: JSON.stringify({ value: tradeData, from: "engine" }), partition: 0 }
            ]
        })

    } catch (error: any) {
        console.log("ERROR : ", error);
        throw new Error(error.message)
    }
}
//  closeTrade RECEIVE THESE DATA IN data{}
//  idemKey, userId, orderId, task: "CLOSE_TRADE"


