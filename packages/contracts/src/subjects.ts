// Single source of truth for NATS subjects shared by backend, engine and poller.

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
