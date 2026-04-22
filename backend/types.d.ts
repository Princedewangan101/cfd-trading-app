import { type Request } from "express";


export interface AuthRequest extends Request {
  userId?: number;
}

export interface ADD_ORDER_INTO_DB_RESULT_TYPE {
  id: any;
  order: any;
  userId: any;
  pair: any;
  lot: any;
  openPrice: any;
  type: any;
  closePrice: any;
  pnl: any;
  task: any;
  timestamp: any;
}

export interface CLOSE_ORDER_INTO_DB_RESULT_TYPE {
  id: any;
  idemKey: any;
  userId: any;
  orderId: any;
  pair: any;
  quantity: any;
  openPrice: any;
  closePrice: any;
  pnl: any;
  type: any;
  createdAt: any;
  netProfitorLoss: any;
  task: any;
  timestamp: any;
}

export enum OrderStatus {
  IN_MEMORY,
  MATCHED,
  CLOSED
}

export enum LedgerTransactionType {
  DEPOSIT,
  WITHDRAWAL,
  FEE_DEDUCTION,
  PROFIT,
  LOSS,
}

export enum WS_EVENT_TYPES {
  TRADE_EXECUTED,
  TRADE_FAILED,
  CLOSE_TRADE_EXECUTED,
  CLOSE_TRADE_FAILED,
  BALANCE_UPDATE,
  PRICE_TICKER,
  ORDERBOOK_UPDATE
}

