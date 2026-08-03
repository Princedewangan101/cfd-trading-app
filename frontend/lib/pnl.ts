import type { Order } from "@/hooks/useOrders";

export const baseOf = (symbol: string) => symbol.slice(0, -3);

export const computePnl = (order: Order, price: number | null): number | null => {
    if (price === null || Number.isNaN(price)) return null;
    const open = Number(order.openPrice);
    const qty = Number(order.quantity);
    if (Number.isNaN(open) || Number.isNaN(qty)) return null;
    const diff = order.side === "BUY" ? price - open : open - price;
    return diff * qty;
};
