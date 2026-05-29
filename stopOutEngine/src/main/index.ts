import { redis } from "../config/redis.js";
import { kafkaProducerSend } from "../kafka/kafkaProducerSend.js";
import { topics } from "../type/type.js";

// THERE IS 3 TYPES OF ORDER WE HAVE TO CLOSE:
// 1. ON SL TRIGGER
// 2. ON TP TRIGGER
// 3. IF USER TOTAL BALANCE REACH LOWER THAN 3 DOLLAR WE WILL CANCEL THE ORDER

export type OrderToClose = {
    closeType: "sl" | "tp",
    symbol: "string",
    side: "BUY" | "SELL",
    price: "number",
    orderId: "string",
    userId: "string",
}

const orderToCloseArray: OrderToClose[] = []; //[{closeType:"sl"/"tp", price:23303, symbol:"SOLUSD", side:"BUY"/"SIDE", orderId:"orderId",  userId:"userId"}]

orderCloseExecutor()

async function orderCloseExecutor() {
    try {
        while (true) {
            const orderToClose = await redis.rpop("sltpOrderClose"); // orderToClose = {closeType:"sl"/"tp", price:23303, symbol:"SOLUSD",side:"BUY"/"SIDE", orderId:"orderId",  userId:"userId"}
            if (!orderToClose) {
                throw new Error("orderToClose not found");
            }

            const parsedOrderToClose = JSON.parse(orderToClose);
            if (!parsedOrderToClose) {
                throw new Error("parsedOrderToClose not found");
            }

            orderToCloseArray.push(parsedOrderToClose);

            // PULLING LIVE PRICE FROM POLLER , livePrice:{symbol:"symbol", price:"price"}
            const livePriceString = await redis.rpop("liveprice")
            if (!livePriceString) {
                console.log('no livePrice in queue (orderCloseEngine/index.ts)', livePriceString);
            }

            if (livePriceString) {
                const parsedLivePrice = JSON.parse(livePriceString);
                // FILTER ORDER FROM ARRAY TO CLOSE/REMOVE
                const filteredOrderToClose = orderToCloseArray.filter((order: OrderToClose) =>
                    (order.closeType === "tp" && order.side === "BUY" && order.price < parsedLivePrice) ||
                    (order.closeType === "sl" && order.side === "SELL" && order.price < parsedLivePrice) ||
                    (order.closeType === "sl" && order.side === "BUY" && order.price > parsedLivePrice) ||
                    (order.closeType === "tp" && order.side === "SELL" && order.price > parsedLivePrice)
                )
                await Promise.all(
                    filteredOrderToClose.map(async (order: OrderToClose) => {
                        const payload = JSON.stringify({ from: "orderCloseEngine", orderObj: order })
                        // FOR CLOSING/REMOVING ORDER IN IN MEMORY ARRAY
                        await redis.lpush("orderToCancel", JSON.stringify({ orderId: order.orderId, side: order.side }))
                        // FOR UPDATING ORDER STSTUS FROM EXECUTION TO COMPLTED
                        kafkaProducerSend(topics.UPDATE_ORDER, payload);
                    })
                )
            }
        }
    } catch (error: any) {
        console.log("ERROR (engine/index.ts) :", error.message);
        throw new Error(error.message)
    }
}