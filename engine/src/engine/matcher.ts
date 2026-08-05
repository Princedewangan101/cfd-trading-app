import type { JetStreamClient, NatsConnection } from "nats";
import { SUBJECTS, type LimitOrder, type TpSlOrder } from "../type/type.js";
import {
    buyLimitOrders,
    getBucket,
    livePrices,
    removeOrderEverywhere,
    sellLimitOrders,
    tpSlOrderMap,
} from "./orderBook.js";

export function setupPriceListener(nc: NatsConnection) {
    const js = nc.jetstream();
    nc.subscribe(`${SUBJECTS.PRICE_PREFIX}>`, {
        callback: (err, msg) => {
            if (err) return;
            try {
                const symbol = msg.subject.slice(SUBJECTS.PRICE_PREFIX.length);
                const { price } = JSON.parse(msg.data.toString()) as { price: number };
                livePrices.set(symbol, Number(price));
                matchSymbol(nc, js, symbol, Number(price));
            } catch (error: any) {
                console.log("ERROR (price listener) :", error.message);
            }
        },
    });
    console.log("> price listener subscribed on price.>");
}

function matchSymbol(nc: NatsConnection, js: JetStreamClient, symbol: string, livePrice: number) {
    matchLimitOrders(nc, js, symbol, livePrice).catch(error => console.log("ERROR (matchLimitOrders) :", error.message));
    scanTpSl(nc, js, symbol, livePrice).catch(error => console.log("ERROR (scanTpSl) :", error.message));
}

// BUY limit order fills when market price drops to or below the limit price (bucket.price >= livePrice)
// SELL limit order fills when market price rises to or above the limit price (bucket.price <= livePrice)
async function matchLimitOrders(nc: NatsConnection, js: JetStreamClient, symbol: string, livePrice: number) {
    const executeBuy = executeBuckets(nc, js, buyLimitOrders, symbol, livePrice, "BUY");
    const executeSell = executeBuckets(nc, js, sellLimitOrders, symbol, livePrice, "SELL");
    await Promise.all([executeBuy, executeSell]);
}

async function executeBuckets(
    nc: NatsConnection,
    js: JetStreamClient,
    buckets: Map<number, LimitOrder[]>,
    symbol: string,
    livePrice: number,
    side: "BUY" | "SELL",
) {
    const matchedBuckets: number[] = [];
    for (const [bucketPrice, orders] of buckets) {
        const hit = side === "BUY" ? bucketPrice >= livePrice : bucketPrice <= livePrice;
        if (!hit) continue;
        for (const order of orders) {
            if (order.symbol !== symbol) continue;
            const payload = JSON.stringify({ from: "engine", orderId: order.orderId, userId: order.userId, openPrice: livePrice });
            // durable publish: order is only removed from the book AFTER the fill is persisted
            await js.publish(SUBJECTS.ORDER_EXECUTED, new TextEncoder().encode(payload));
            removeOrderEverywhere(order.orderId);
            console.log("> executed", side, "limit order :", order.orderId, "@", livePrice);
        }
        if (buckets.get(bucketPrice)?.length === 0) {
            matchedBuckets.push(bucketPrice);
        }
    }
    for (const bucketPrice of matchedBuckets) {
        if (buckets.get(bucketPrice)?.length === 0) {
            buckets.delete(bucketPrice);
        }
    }
}

// BUY : TP hit when price >= tp, SL hit when price <= sl
// SELL: TP hit when price <= tp, SL hit when price >= sl
async function scanTpSl(nc: NatsConnection, js: JetStreamClient, symbol: string, livePrice: number) {
    const toClose: TpSlOrder[] = [];
    for (const order of tpSlOrderMap.values()) {
        if (order.symbol !== symbol) continue;
        let hit = false;
        if (order.side === "BUY") {
            if (order.tp !== null && livePrice >= order.tp) hit = true;
            else if (order.sl !== null && livePrice <= order.sl) hit = true;
        } else {
            if (order.tp !== null && livePrice <= order.tp) hit = true;
            else if (order.sl !== null && livePrice >= order.sl) hit = true;
        }
        if (hit) toClose.push(order);
    }

    await Promise.all(toClose.map(async (order) => {
        const payload = JSON.stringify({
            from: "engine",
            orderObj: { orderId: order.orderId, userId: order.userId, tp: order.tp, sl: order.sl, symbol: order.symbol, side: order.side },
        });
        // durable publish: order is only removed from the book AFTER the close is persisted
        await js.publish(SUBJECTS.ORDER_COMPLETED, new TextEncoder().encode(payload));
        removeOrderEverywhere(order.orderId);
        console.log("> TP/SL closed order :", order.orderId);
    }));
}

// placeholder to keep noUnusedLocals-friendly if bucket helpers change
void getBucket;
