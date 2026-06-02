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
