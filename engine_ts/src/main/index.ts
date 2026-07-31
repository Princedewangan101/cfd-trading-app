import { redis } from "../config/redis.js";
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

limitOrderMatcher()

async function limitOrderMatcher() {
    try {
        let blimitOrders: BuyOrder[] = [];
        let slimitOrders: SellOrder[] = [];

        while (true) {
            // REMOVING ORDERS OF THOSE USER WHOSE TOTAL BALANCE IS ABOUT TO 0.
            removingOrdersWhoseBalanceNearToZero()

            // PUSHING LIMITORDER INTO ARRAY
            limitOrderIntoArray()

            // PULLING ORDER HAVE WE HAVE TO REMOVE FROM ORDER ARRAY.
            removeOrderFromArray()

            // PULLING LIVE PRICE FROM POLLER , livePrice:{symbol:"symbol", price:"2678833"}
            executingLimitOrders()
        }

        async function removingOrdersWhoseBalanceNearToZero() {
            const userId = await redis.rpop("orderCloseBecauseOfLowBalance") || "0" ; // "{userId: "userId"}"
            if (!userId) {
                throw new Error("Error: failed to close order who's balance is about to zero.");
            }
            if (userId === "0") {
                console.log("there is no user whose balance is near to zero.");
            } else {
                const parsedUserId = JSON.parse(userId); // {userId: "userId"}
                if (!parsedUserId){
                    throw new Error("Error: failed to parse userId.");
                } else {
                    // TODO : OPTIMIZE
                    blimitOrders = blimitOrders.filter((order: BuyOrder) => order.userId === parsedUserId.userId)
                    slimitOrders = slimitOrders.filter((order: SellOrder) => order.userId === parsedUserId.userId)
                }
            }
        }

        async function limitOrderIntoArray() {
            const order = await redis.rpop("limitOrders");
            if (!order) {
                throw new Error("order not found !");
            }

            const parsedOrder = JSON.parse(order);
            if (!parsedOrder) {
                throw new Error("parsedOrder not found !");
            }
            console.log("> parsedOrder :", parsedOrder);
            parsedOrder.side === "BUY" ? blimitOrders.push(parsedOrder) : slimitOrders.push(parsedOrder)

            console.log("> slimitOrders :", slimitOrders);
            console.log("> blimitOrders :", blimitOrders);
        }

        async function removeOrderFromArray() {
            const orderToCancel = await redis.rpop("orderToCancel") // orderToCancel = "{orderId:"uuid", side:"BUY|SELL"}"
            if (!orderToCancel) {
                console.log("📦📦📦 EMPTY removeOrderFromArray() ");
            } else {
                const parsedOrderToCancel = JSON.parse(orderToCancel); // parsedOrderToCancel = {orderId:"uuid", side:"BUY|SELL"}
                if (!parsedOrderToCancel) {
                    throw new Error("ERROR: failed to parse the order (that we have to cancle) removeOrderFromArray()");
                }
                if (parsedOrderToCancel.side === "BUY") {
                    blimitOrders = blimitOrders.filter((o: BuyOrder) => o.orderId !== parsedOrderToCancel.orderId);
                } else {
                    slimitOrders = blimitOrders.filter((o: SellOrder) => o.orderId !== parsedOrderToCancel.orderId);
                }
            }
        }

        async function executingLimitOrders() {
            const livePrice = await redis.rpop("liveprice") // { symbol: BTC_USDC, price: "6574288" }
            if (!livePrice) {
                console.log('no livePrice in queue (engine/index.ts)', livePrice);
            } else {
                const parsedLivePrice = JSON.parse(livePrice);
                console.log("> parsedLivePrice", parsedLivePrice);

                if (!parsedLivePrice) {
                    throw new Error("failed to parse live price, executingLimitOrders()");
                } else {
                    const validBuyOrderForExecution = blimitOrders.filter(o => o.symbol === parsedLivePrice.symbol && o.price > parsedLivePrice.price);
                    await Promise.all(validBuyOrderForExecution.map(async (order: BuyOrder) => {
                        blimitOrders = blimitOrders.filter((o: BuyOrder) => o.orderId !== order.orderId);

                        const updateOrderPayload = JSON.stringify({ from: "engine", userId: order.userId, orderId: order.orderId, openPrice: parsedLivePrice.price })
                        await redis.lpush(topics.UPDATE_ORDER, updateOrderPayload)

                        // const realtimeupdatePayload = JSON.stringify({ userId: order.userId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })
                        // const notifyPayload = JSON.stringify({ userId: order.userId, orderId: order.orderId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })

                        // await kafkaProducerSend(topics.UPDATE_ORDER, updateOrderPayload)
                        // await kafkaProducerSend(topics.REAL_TIME_UPDATE, realtimeupdatePayload) // TODO: let use SSE
                        // await kafkaProducerSend(topics.NOTIFY_USER, notifyPayload);

                    }));

                    const validSellOrderForExecution = slimitOrders.filter(o => o.symbol === parsedLivePrice.symbol && o.price < parsedLivePrice.price);
                    await Promise.all(validSellOrderForExecution.map(async (order: SellOrder) => {
                        slimitOrders = slimitOrders.filter((o: BuyOrder) => o.orderId !== order.orderId);

                        const updateOrderPayload = JSON.stringify({ from: "engine", userId: order.userId, orderId: order.orderId, openPrice: parsedLivePrice.price })
                        await redis.lpush(topics.UPDATE_ORDER, updateOrderPayload)

                        // const realtimeupdatePayload = JSON.stringify({ userId: order.userId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })
                        // const notifyPayload = JSON.stringify({ userId: order.userId, orderId: order.orderId, message: `Your limit order ${order.orderId} was executed at ${parsedLivePrice.price}` })

                        // await kafkaProducerSend(topics.UPDATE_ORDER, updateOrderPayload)
                        // await kafkaProducerSend(topics.REAL_TIME_UPDATE, realtimeupdatePayload)  // TODO: let use SSE
                        // await kafkaProducerSend(topics.NOTIFY_USER, notifyPayload);
                    }));
                }
            }
        }
    } catch (error: any) {
        console.log("ERROR (engine/index.ts) :", error.message);
    }
}

















