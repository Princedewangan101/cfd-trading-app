export interface ORDER {
  // orderId, userId, quantity, pair, openPrice, type, timestamp 
  orderId: string;
  userId: number;
  pair: string;
  quantity: number;
  openPrice: number;
  closePrice: number | null;
  type: string;
  timestamp: string;
}

export type Side = 'BUY' | 'SELL'

export interface BID_ASK_TYPE {
  userId: number;
  orderId: string;
  pair: string;
  openPrice: number;
  quantity: number;
  timestamp: number;
}