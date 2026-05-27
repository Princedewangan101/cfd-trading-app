import { redis } from "../config/redis.js";
import { producer } from "../kafka/producer.js";
import { topics, UpdateOrderType } from "../type/type.js";
import { kafkaProducerSend } from "../kafka/kafkaProducerSend.js";

declare module 'ioredis' {
    interface Redis {
        matchAndRemoveBuyOrders(key: string, livePrice: string): Promise<string[]>;
    }
}

async function limitOrderMatcher(symbol: string, side: string) {
    const matchAndRemoveScript = `
        local orders = redis.call("ZRANGEBYSCORE", KEYS[1], ARGV[1], "+inf")
        if #orders > 0 then 
            redis.call("ZREMBYSCORE", KEYS[1], ARGV[1], "+inf")
        end
        return orders
    `
    redis.defineCommand("matchAndRemoveBuyOrders", {
        numberOfKeys: 1,
        lua: matchAndRemoveScript
    })

    const livePrice = (Number(await redis.get(`LIVE-PRICE-${symbol}`))) * 100 // "2377.33" -> 237733
    if (!livePrice) return [];

    const result = await redis.matchAndRemoveBuyOrders(`${symbol}-${side}`, `${livePrice}`)

    if (!result || result.length === 0) {
        return console.log("'matchAndRemoveBuyOrders' failed to get orders !");
    }

    for (let i = 0; i < result.length; i += 2) {
        const [orderId, userId] = result[i]?.split(',') ?? [];

        kafkaProducerSend(topics.UPDATE_ORDER, JSON.stringify({ userId, orderId }))
        kafkaProducerSend(topics.REAL_TIME_UPDATE, JSON.stringify({ userId, message: `Your limit order ${orderId} was executed at ${livePrice}` }))
        kafkaProducerSend(topics.NOTIFY_USER, JSON.stringify({ userId, orderId, message: `Your limit order ${orderId} was executed at ${livePrice}` }))
    }
}


// result = [
//   "order123,user929",
//   "order124,user838",
//   "order113,user999",
//   "order114,user838",
//   "order143,user999",
//   "order144,user818",
// ]