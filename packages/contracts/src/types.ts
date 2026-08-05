// Shared domain types. OrderStatus / OrderSide / TransactionType mirror the
// values in backend/prisma/schema.prisma (the DB is the source of truth).

export type Side = "BUY" | "SELL";

export const OrderStatus = {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    COMPLETED: 'COMPLETED',
    CLOSED: 'CLOSED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderSide = {
    BUY: 'BUY',
    SELL: 'SELL',
} as const;

export type OrderSide = (typeof OrderSide)[keyof typeof OrderSide];

export const TransactionType = {
    DEPOSIT: 'DEPOSIT',
    WITHDRAW: 'WITHDRAW',
    FEE: 'FEE',
    PROFIT: 'PROFIT',
    LOSS: 'LOSS',
    SWAP: 'SWAP',
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export type Price = number;
export type LatestPrice = number;
export type Symbol = string;
export type UserId = string;
export type OrderId = string;

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
