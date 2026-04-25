import { TradeStatus } from "../../types.js";
import producer from "../kafka/producer.js";
import { getBalanceFromCache } from "../utils.js";


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

        // CALCULATION OF REQ-BALANCE & FEE
        const requiredBalance = Number(quantity) * Number(openPrice);
        const Fee = (requiredBalance * 2) / 100
        const requiredBalanceWithFee = requiredBalance + Fee

        if (userBalance < requiredBalance) throw new Error("INSUFFICIENT_FUNDS");
        

        // LIQUIDATE-PRICE 
        const liquidatePrice = (Number(openPrice) / 10)

        const tradeData = {
            id, userId, pair, quantity, openPrice, closePrice, type, pnl, requiredBalance, requiredBalanceWithFee, Fee,liquidatePrice,
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
        throw new Error(error.message);
    }
}
