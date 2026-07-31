export const SUBJECTS = {
    // backend -> engine (request-reply, engine responds)
    LIMIT_ORDER_SUBMIT: "engine.limitOrder.submit",
    ORDER_CANCEL: "engine.order.cancel",
    ORDER_TP_SL: "engine.order.tpSl",
    ORDER_CLOSE: "engine.order.close",
    USER_CLOSE_ORDERS: "engine.user.closeOrders",

    // engine -> backend (pub/sub push events, no reply)
    ORDER_EXECUTED: "backend.order.executed",
    ORDER_COMPLETED: "backend.order.completed",

    // poller -> engine (pub/sub live price)  price.<symbol>
    PRICE_PREFIX: "price.",
} as const;

export type Side = "BUY" | "SELL";

export interface LimitOrder {
    orderId: string;
    userId: string;
    symbol: string;
    side: Side;
    price: number;
    quantity: number;
    leverage: number;
}

export interface TpSlOrder {
    orderId: string;
    userId: string;
    symbol: string;
    side: Side;
    tp: number | null;
    sl: number | null;
    openPrice: number;
}

export interface CloseOrderRequest {
    id: string;
    orderId: string;
    symbol: string;
}
