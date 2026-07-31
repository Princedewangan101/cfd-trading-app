import type { LimitOrder, Side, TpSlOrder, Price, UserId, OrderId, LatestPrice, Symbol } from "../type/type.js";

// price-bucketed order lists (BTreeMap-like, add/remove/modify per bucket)
export const buyLimitOrders = new Map<Price, LimitOrder[]>();
export const sellLimitOrders = new Map<Price, LimitOrder[]>();

// userId -> all orderIds of that user (bulk removal on low balance)
export const userOrdersLookup = new Map<UserId, Set<OrderId>>();

// existence check + targeted order removal per side
export const buyOrdersLookup = new Set<OrderId>();
export const sellOrdersLookup = new Set<OrderId>();

// orderId -> {tp, sl, symbol, side, userId, openPrice} for TP/SL scanning
export const tpSlOrderMap = new Map<OrderId, TpSlOrder>();

// symbol -> latest price
export const livePrices = new Map<Symbol, LatestPrice>();

// internal index to locate the price bucket for an order (needed to remove from Map<price, Order[]>)a
const orderBucketIndex = new Map<OrderId, { side: Side; price: number; userId: string }>();

export function getBucket(side: Side): Map<number, LimitOrder[]> {
    return side === "BUY" ? buyLimitOrders : sellLimitOrders;
}

export function addLimitOrder(order: LimitOrder) {
    const bucket = getBucket(order.side);
    const orders = bucket.get(order.price) ?? [];
    orders.push(order);
    bucket.set(order.price, orders);

    if (order.side === "BUY") {
        buyOrdersLookup.add(order.orderId);
    } else {
        sellOrdersLookup.add(order.orderId);
    }

    const userOrders = userOrdersLookup.get(order.userId) ?? new Set<string>();
    userOrders.add(order.orderId);
    userOrdersLookup.set(order.userId, userOrders);

    orderBucketIndex.set(order.orderId, { side: order.side, price: order.price, userId: order.userId });
}

export function removeLimitOrder(orderId: string, fallbackSide?: Side) {
    const index = orderBucketIndex.get(orderId);
    if (index) {
        const bucket = getBucket(index.side);
        const orders = bucket.get(index.price) ?? [];
        bucket.set(index.price, orders.filter(o => o.orderId !== orderId));
        if (bucket.get(index.price)?.length === 0) {
            bucket.delete(index.price);
        }
        userOrdersLookup.get(index.userId)?.delete(orderId);
        orderBucketIndex.delete(orderId);
    }

    const side = index?.side ?? fallbackSide;
    if (side === "BUY") {
        buyOrdersLookup.delete(orderId);
    } else if (side === "SELL") {
        sellOrdersLookup.delete(orderId);
    } else {
        buyOrdersLookup.delete(orderId);
        sellOrdersLookup.delete(orderId);
    }
}

export function removeUserOrders(userId: string) {
    const userOrders = userOrdersLookup.get(userId);
    if (!userOrders) return;
    for (const orderId of [...userOrders]) {
        removeLimitOrder(orderId);
    }
    userOrdersLookup.delete(userId);
}

export function removeOrderEverywhere(orderId: string, side: Side) {
    removeLimitOrder(orderId, side);
    tpSlOrderMap.delete(orderId);
}
