import Decimal from "decimal.js";
import { OrderStatus, TransactionType } from "../../generated/prisma/enums.js";
import { add, div, mul, sub } from "../util/money.js";

// ----- order cost / notional / margin -------------------------------------

export const computeOrderCost = (quantity: Decimal.Value, price: Decimal.Value, leverage: Decimal.Value): Decimal =>
    mul(quantity, div(price, leverage));

// Market orders charge a fixed dollar fee per quantity unit.
export const computeOrderCostWithFee = (
    quantity: Decimal.Value,
    price: Decimal.Value,
    leverage: Decimal.Value
): { orderCost: Decimal; fee: Decimal; orderCostWithFee: Decimal } => {
    const orderCost = computeOrderCost(quantity, price, leverage);
    const fee = new Decimal("0.20");
    const orderCostWithFee = add(orderCost, mul(quantity, fee));
    return { orderCost, fee, orderCostWithFee };
};

// ----- order row creation --------------------------------------------------

interface CreateOrderInput {
    userId: string;
    symbol: string;
    side: string;
    quantity: Decimal.Value;
    leverage: Decimal.Value;
    openPrice: Decimal.Value;
    price?: Decimal.Value;
    status: (typeof OrderStatus)[keyof typeof OrderStatus];
}

export async function createOrderTx(tx: any, input: CreateOrderInput) {
    return tx.order.create({
        data: {
            userId: input.userId,
            symbol: input.symbol,
            side: input.side,
            quantity: Number(input.quantity),
            leverage: Number(input.leverage),
            openPrice: Number(input.openPrice),
            ...(input.price !== undefined ? { price: Number(input.price) } : {}),
            closePrice: null,
            tp: null,
            sl: null,
            status: input.status,
        },
    });
}

// ----- close / settle shared logic -----------------------------------------

interface SettleOrderInput {
    orderId: string;
    userId: string;
    side: string;
    closePrice: Decimal.Value;
    openPrice: Decimal.Value;
    quantity: Decimal.Value;
    leverage: Decimal.Value;
}

// Computes PnL + released margin, records the PROFIT/LOSS transaction row and
// credits the balance inside the caller's transaction. Returns balanceIncrement.
export async function settleOrder(tx: any, input: SettleOrderInput): Promise<Decimal> {
    const { orderId, userId, side, closePrice, openPrice, quantity, leverage } = input;

    const pnl = side === "BUY" ? sub(closePrice, openPrice) : sub(openPrice, closePrice);
    const releaseBalance = mul(quantity, div(openPrice, leverage));
    const balanceIncrement = add(releaseBalance, pnl);

    await tx.transaction.create({
        data: {
            orderId,
            userId,
            type: pnl.gt(0) ? TransactionType.PROFIT : TransactionType.LOSS,
            amount: pnl.toNumber(),
        },
    });

    await tx.user.update({
        where: { userId },
        data: { balance: { increment: balanceIncrement.toNumber() } },
    });

    return balanceIncrement;
}
