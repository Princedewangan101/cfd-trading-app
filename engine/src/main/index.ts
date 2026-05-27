import { redis } from "../config/redis.js";
import { kafkaProducerSend } from "../kafka/kafkaProducerSend.js";
import { topics } from "../type/type.js";

type BuyOrder = {
    orderId: "string";
    userId: "string";
    symbol: "string";
    side: "BUY";
    price: "number";
}

type SellOrder = {
    orderId: "string";
    userId: "string";
    symbol: "string";
    side: "BUY";
    price: "number";
}

// 1. PULL ORDER FROM QUEUE, PARSE IT, STORE IN ITS RESPECTIVE ARRAY[]. 
// 2. WE PULL ORDER FORM QUEUE 
// 2. WHEN EVER THE PRICE GET CHANGE WE WILL RECEIVE A NEW PRICE IN QUEUE FROM POLLER SERVICE, WHEN LIVEPRICE === TRUE WE WILL FILTER ORDER FROM ARRAY WHOSE SYMBOL IS EQUAL TO THE SYMBOL OF CHANGED PRICE ASSET.
// 3. WE SEND UPDATE_ORDER EVENT THAT WILL UPDATE ORDER STATUS IN BACKEND DATABASE. 
// 4. WE SEND REALTIME UPDATE FOR ONLINE UPDATE AND NOTIFY EVENT FOR OFFLINE UPDATE VIA EMAIL.
// 5. EDGE CASE : IF USER CANCEL LIMIT ORDER IN BACKEND BUT IF ENGINE THREAD IS AFTER LINE 66 THE ORDER WILL EXECUTE NO MATTER WHAT USER DOES IN BACKEND ? TO SOLVE THIS WE WILL CACHE THE CANCEL ORDER ID IN REDIS FOR 5 MIN AND IN ENGINE WILL CHECK THAT ORDER ID EXIST IN CACHE OR NOT, IF EXIST WE CANCEL THAT ORDER AND IF NOT EXIST THE PROCESS WILL CONTINUE AS NOTHING HAPPEN.  

limitOrderMatcher()

async function limitOrderMatcher() {
    try {
        var blimitOrders: BuyOrder[] = [];
        var slimitOrders: SellOrder[] = [];

        while (true) {
            const order = await redis.rpop("limitOrderExecution");
            if (!order) {
                throw new Error("order not found !");
            }

            const parsedOrder = JSON.parse(order);
            if (!parsedOrder) {
                throw new Error("parsedOrder not found !");
            }

            parsedOrder.side === "BUY" ? blimitOrders.push(parsedOrder) : slimitOrders.push(parsedOrder)

            // PULLING ORDER HAVE WE HAVE TO REMOVE FROM ORDER ARRAY.
            const orderToCancel = await redis.rpop("orderToCancel") // orderToCancel = "{orderId:"uuid", side:"BUY|SELL"}"
            if (!orderToCancel) {
                console.log('no order in queue to cancel (engine/index.ts)', orderToCancel);
            }
            
            if (orderToCancel) {
                const parsedOrderToCancel = JSON.parse(orderToCancel); // parsedOrderToCancel = {orderId:"uuid", side:"BUY|SELL"}
                if (!parsedOrderToCancel) {
                    throw new Error("parsedOrderToCancel not found !");
                }
                if (parsedOrderToCancel.side === "BUY") {
                    const newBuyLimitOrders = blimitOrders.filter((o: BuyOrder) => o.orderId !== parsedOrderToCancel.orderId);
                    var blimitOrders = newBuyLimitOrders;
                } else {
                    const newSellLimitOrders = blimitOrders.filter((o: SellOrder) => o.orderId !== parsedOrderToCancel.orderId);
                    var slimitOrders = newSellLimitOrders;
                }
                await redis.set(`cancelOrder:${parsedOrderToCancel.orderId}`, "");
            }

            // PULLING LIVE PRICE FROM POLLER , livePrice:{symbol:"symbol", price:"price"}
            const livePrice = await redis.rpop("liveprice")
            if (!livePrice) {
                console.log('no livePrice in queue (engine/index.ts)', livePrice);
            }

            if (livePrice) {
                const parsedLivePrice = JSON.parse(livePrice);
                if (parsedLivePrice) {
                    const validBuyOrderForExecution = blimitOrders.filter(o => o.symbol === parsedLivePrice.symbol && o.price > parsedLivePrice.price);
                    await Promise.all(validBuyOrderForExecution.map(async (order: BuyOrder) => {

                        const forCancelOrderExistInCache = await redis.get(`cancelOrder:${order.orderId}`);
                        if (forCancelOrderExistInCache) {
                            blimitOrders.filter((o: BuyOrder) => o.orderId !== order.orderId);
                        } else {
                            const updateOrderPayload = JSON.stringify({ userId: order.userId, orderId: order.orderId, openPrice: parsedLivePrice.price })
                            const realtimeupdatePayload = JSON.stringify({ userId: order.userId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })
                            const notifyPayload = JSON.stringify({ userId: order.userId, orderId: order.orderId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })

                            await kafkaProducerSend(topics.UPDATE_ORDER, updateOrderPayload)
                            await kafkaProducerSend(topics.REAL_TIME_UPDATE, realtimeupdatePayload)
                            await kafkaProducerSend(topics.NOTIFY_USER, notifyPayload);

                            blimitOrders.filter((o: BuyOrder) => o.orderId !== order.orderId);
                        }
                    }))

                    const validSellOrderForExecution = slimitOrders.filter(o => o.symbol === parsedLivePrice.symbol && o.price < parsedLivePrice.price);
                    await Promise.all(validSellOrderForExecution.map(async (order: SellOrder) => {
                        const forCancelOrderExistInCache = await redis.get("cancelOrder");
                        if (forCancelOrderExistInCache) {
                            blimitOrders.filter((o: BuyOrder) => o.orderId !== order.orderId);
                        } else {
                            const updateOrderPayload = JSON.stringify({ userId: order.userId, orderId: order.orderId, openPrice: parsedLivePrice.price })
                            const realtimeupdatePayload = JSON.stringify({ userId: order.userId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })
                            const notifyPayload = JSON.stringify({ userId: order.userId, orderId: order.orderId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })

                            await kafkaProducerSend(topics.UPDATE_ORDER, updateOrderPayload)
                            await kafkaProducerSend(topics.REAL_TIME_UPDATE, realtimeupdatePayload)
                            await kafkaProducerSend(topics.NOTIFY_USER, notifyPayload);

                            slimitOrders.filter((o: BuyOrder) => o.orderId !== order.orderId);
                        }
                    }))
                }
            }
        }
    } catch (error: any) {
        console.log("ERROR (engine/index.ts) :", error.message);
        throw new Error(error.message)
    }
}


















