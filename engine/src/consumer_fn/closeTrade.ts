import { TradeStatus } from "../../types.js";
import producer from "../kafka/producer.js";



export async function closeTrade(id: string, data: any) {
    try {
        if (!id || !data) throw new Error("ENGINE- OPENTRADE FN MISSING REQUIRED FIELDS !")

        const { idemKey, orderId, userId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, task } = data;
        if (!id || !idemKey || !userId || !orderId || !task) throw new Error("ENGINE- OPENTRADE FN MISSING REQUIRED FIELDS !")

        const netProfitorLoss = type === "BUY" ?
            Number(closePrice - openPrice) * Number(quantity)
            :
            Number(openPrice - closePrice) * Number(quantity)

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

