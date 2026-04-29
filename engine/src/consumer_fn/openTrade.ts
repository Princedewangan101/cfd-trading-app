import { timeStamp } from "console";
import { TradeStatus } from "../../types.js";
import producer from "../kafka/producer.js";
import { getBalanceFromCache } from "../utils.js";
import { randomUUID } from "crypto";


export async function openTrade(id: string, data: any) {
    try {
        if (!id || !data) throw new Error("ENGINE- OPENTRADE FN MISSING REQUIRED FIELDS !")

        const { userId, pair, quantity, openPrice, type, closePrice, pnl } = data; // "task" is also there


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

        // CALCULATION OF REQUIRE-BALANCE & FEE
        const requiredBalance = Number(quantity) * Number(openPrice);
        const Fee = (requiredBalance * 2) / 100
        const requiredBalanceWithFee = requiredBalance + Fee

        const userBalance = await getBalanceFromCache(userId);

        if (userBalance < requiredBalanceWithFee) throw new Error("INSUFFICIENT_FUNDS");

        // LIQUIDATE-PRICE 
        const liquidatePrice = (Number(openPrice) / 10)


        // ORDER MATCHING EVENT POPULATE
        const orderId = randomUUID();
        const timestamp = Date.now();
        const orderData = { orderId, userId, quantity, pair, openPrice, type, timestamp }
        const dataToSaveInDb = {
            id, userId, pair, quantity, openPrice, closePrice, type, pnl, requiredBalance, requiredBalanceWithFee, Fee, liquidatePrice, timestamp
        }
        await producer.send(
            {
                topic: "order-matching",
                messages: [
                    { value: JSON.stringify({id, value: orderData, dataToSaveInDb, type, timestamp, task: 'match', from: "engine" }), partition: 0 }
                ]
            }
        )


        // //  SAVING ORDER INTO DB 
        // await producer.send({
        //     topic: "trade-result",
        //     messages: [
        //         { value: JSON.stringify({ value, from: "engine" }), partition: 0 }
        //     ]
        // })

    } catch (error: any) {
        console.log("ERROR : ", error);
        throw new Error(error.message);
    }
}
