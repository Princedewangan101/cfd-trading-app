import { type Request } from "express";


export interface AuthRequest extends Request {
  userId?: number;
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

