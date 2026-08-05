import Decimal from "decimal.js";

// Money-safe arithmetic. All fee/notional/margin math runs through decimal.js
// (precision 30, HALF_UP); convert to JS Number only at the Prisma boundary.

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const USD_DP = 2;
const QTY_DP = 8;

export const money = (value: Decimal.Value): Decimal => new Decimal(value);

export const add = (...values: Decimal.Value[]): Decimal => {
    let sum = new Decimal(0);
    for (const value of values) sum = sum.plus(value);
    return sum;
};

export const sub = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).minus(b);

export const mul = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).times(b);

export const div = (a: Decimal.Value, b: Decimal.Value): Decimal => new Decimal(a).div(b);

export const roundUsd = (value: Decimal.Value): Decimal => new Decimal(value).toDecimalPlaces(USD_DP);

export const roundQty = (value: Decimal.Value): Decimal => new Decimal(value).toDecimalPlaces(QTY_DP);

// number conversion ONLY for writing to Prisma / returning to the client
export const toNumber = (value: Decimal.Value): number => new Decimal(value).toNumber();
