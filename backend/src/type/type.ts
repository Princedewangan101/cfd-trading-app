export enum OrderStatus {
  PENDING = 'PENDING',
  EXECUTION = 'EXECUTION',
  COMPLETED = 'COMPLETED',
  CANCEL = 'CANCEL'
}

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
  FEE = "FEE",
  PROFIT = "PROFIT",
  LOSS = "LOSS",
  SWAP = "SWAP",
}

export enum OrderSide {
  "BUY",
  "SELL"
}

export const SUBJECTS = {
    // backend -> engine (request-reply)
    LIMIT_ORDER_SUBMIT: "engine.limitOrder.submit",
    ORDER_CANCEL: "engine.order.cancel",
    ORDER_TP_SL: "engine.order.tpSl",
    ORDER_CLOSE: "engine.order.close",
    USER_CLOSE_ORDERS: "engine.user.closeOrders",

    // engine -> backend (pub/sub push events)
    ORDER_EXECUTED: "backend.order.executed",
    ORDER_COMPLETED: "backend.order.completed",
} as const;
