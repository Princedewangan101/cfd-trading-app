import { redis } from "../config/redis.js";
import { kafkaProducerSend } from "../kafka/kafkaProducerSend.js";
import { topics } from "../type/type.js";
import { dataPush, delay } from "./dummyDataPush.js";

export type OrderToClose = {
    tp: "number",
    sl: "number",
    symbol: "string",
    side: "BUY" | "SELL",
    price: "number",
    orderId: "string",
    userId: "string",
}

const orderMap = new Map(); // orderId:{orderId:"orderId", tp:23303, sl:23303, symbol:"SOLUSD", side:"BUY"/"SIDE", userId:"userId" }

orderCloseExecutor()

async function orderCloseExecutor() {
    try {
        while (true) {
            dataPush()
            const order = await redis.rpop("sltpOrderClose"); // order = {tp:23303, sl:23303, symbol:"SOLUSD",side:"BUY"/"SIDE", orderId:"orderId", userId:"userId"}
            if (!order) {
                console.log('no new order to stop (orderCloseEngine/index.ts)');
            } else {
                const parsedOrder = JSON.parse(order);
                if (!parsedOrder) {
                    console.log('no new order to stop (orderCloseEngine/index.ts)');
                } else {
                    console.log("📦 parsedOrder : ", parsedOrder);

                    orderMap.set(order.orderId, order)

                    // PULLING LIVE PRICE FROM POLLER , livePrice:{symbol:"symbol", price:"price"}
                    const livePriceString = await redis.rpop("liveprice")
                    if (!livePriceString) {
                        console.log('no new livePrice in queue (orderCloseEngine/index.ts)', livePriceString);
                    }

                    if (livePriceString) {
                        const parsedLivePrice = JSON.parse(livePriceString);
                        // FILTER ORDER FROM ARRAY TO CLOSE/REMOVE
                        // const filteredOrderToClose = orderMap.

                        const filteredOrder = [];

                        for (const [ordId, ordDetails] of orderMap) {
                            if (ordDetails.symbol === parsedLivePrice.symbol) {
                                if (ordDetails.tp < parsedLivePrice && ordDetails.side === "BUY") {
                                    filteredOrder.push(ordDetails)
                                } else if (ordDetails.sl < parsedLivePrice && ordDetails.side === "SELL") {
                                    filteredOrder.push(ordDetails)
                                } else if (ordDetails.sl > parsedLivePrice && ordDetails.side === "BUY") {
                                    filteredOrder.push(ordDetails)
                                } else if (ordDetails.tp > parsedLivePrice && ordDetails.side === "SELL") {
                                    filteredOrder.push(ordDetails)
                                }
                            }
                        }

                        await Promise.all(
                            filteredOrder.map(async (order) => {
                                // FOR CLOSING/REMOVING ORDER IN IN MEMORY ARRAY
                                await redis.lpush("orderToCancel", JSON.stringify({ orderId: order.orderId, side: order.side }))

                                const payload = JSON.stringify({ from: "orderCloseEngine", orderObj: order })
                                // FOR UPDATING ORDER STSTUS FROM EXECUTION TO COMPLTED
                                await redis.lpush(topics.UPDATE_ORDER, payload)
                                // kafkaProducerSend(topics.UPDATE_ORDER, payload);
                            })
                        )
                    }
                }
            }
        }
    } catch (error: any) {
        console.log("ERROR (engine/index.ts) :", error.message);
    }
}