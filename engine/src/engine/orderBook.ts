import type { LimitOrder, Side, TpSlOrder, Price, UserId, OrderId, LatestPrice, Symbol } from "../type/type.js";

// price-bucketed order lists (BTreeMap-like, add/remove/modify per bucket)
export const buyLimitOrders = new Map<Price, LimitOrder[]>();
export const sellLimitOrders = new Map<Price, LimitOrder[]>();

// userId -> all orderIds of that user (bulk removal on low balance)
export const userOrdersLookup = new Map<UserId, Set<OrderId>>();

// existence check + targeted order removal per side, value holds bucket info
// (side is implied by which map the orderId belongs to)
export const buyOrdersLookup = new Map<OrderId, { price: Price; userId: UserId }>();
export const sellOrdersLookup = new Map<OrderId, { price: Price; userId: UserId }>();

// orderId -> {tp, sl, symbol, side, userId, openPrice} for TP/SL scanning
export const tpSlOrderMap = new Map<OrderId, TpSlOrder>();

// symbol -> latest price
export const livePrices = new Map<Symbol, LatestPrice>();

export function getBucket(side: Side): Map<Price, LimitOrder[]> {
    return side === "BUY" ? buyLimitOrders : sellLimitOrders;
}

export function addLimitOrder(order: LimitOrder) {
    const bucket = getBucket(order.side);
    const orders = bucket.get(order.price) ?? [];
    orders.push(order);
    bucket.set(order.price, orders);

    if (order.side === "BUY") {
        buyOrdersLookup.set(order.orderId, { price: order.price, userId: order.userId });
    } else {
        sellOrdersLookup.set(order.orderId, { price: order.price, userId: order.userId });
    }

    const userOrders = userOrdersLookup.get(order.userId) ?? new Set<OrderId>();
    userOrders.add(order.orderId);
    userOrdersLookup.set(order.userId, userOrders);
}

export function removeLimitOrder(orderId: OrderId) {
    const buyIndex = buyOrdersLookup.get(orderId);
    const sellIndex = sellOrdersLookup.get(orderId);
    const index = buyIndex ?? sellIndex;

    if (index) {
        const side = buyIndex ? "BUY" : "SELL";
        const bucket = getBucket(side);
        const orders = bucket.get(index.price) ?? [];
        bucket.set(index.price, orders.filter(o => o.orderId !== orderId));
        if (bucket.get(index.price)?.length === 0) {
            bucket.delete(index.price);
        }
        userOrdersLookup.get(index.userId)?.delete(orderId);
        if (buyIndex) {
            buyOrdersLookup.delete(orderId);
        } else {
            sellOrdersLookup.delete(orderId);
        }
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

export function removeOrderEverywhere(orderId: string) {
    removeLimitOrder(orderId);
    tpSlOrderMap.delete(orderId);
}
