import { Pool } from "pg";
import { addLimitOrder, tpSlOrderMap } from "../engine/orderBook.js";
import type { Side } from "../type/type.js";

interface RehydrateRow {
    orderId: string;
    userId: string;
    symbol: string;
    side: Side;
    quantity: string;
    leverage: number;
    price: string | null;
    openPrice: string | null;
    tp: string | null;
    sl: string | null;
    status: "PENDING" | "RUNNING";
}

// Rebuilds the in-memory order book (limit orders + TP/SL map) from DB rows
// left in PENDING/RUNNING state by a previous run (DB is source of truth).
export async function rehydrateOrderBook(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.log("\n> [WARN] (rehydrate.ts) : DATABASE_URL not set - skipping order book rehydrate");
        return;
    }

    const pool = new Pool({ connectionString: databaseUrl });
    try {
        const result = await pool.query<RehydrateRow>(
            `SELECT "orderId", "userId", "symbol", "side", "quantity", "leverage",
                    "price", "openPrice", "tp", "sl", "status"
             FROM "Order"
             WHERE "status" IN ('PENDING', 'RUNNING')`
        );

        for (const row of result.rows) {
            const restingPrice = Number(row.price ?? row.openPrice ?? 0);
            if (row.status === "PENDING") {
                addLimitOrder({
                    orderId: row.orderId,
                    userId: row.userId,
                    symbol: row.symbol,
                    side: row.side,
                    price: restingPrice,
                    quantity: Number(row.quantity ?? 0),
                    leverage: Number(row.leverage ?? 1),
                });
            } else if (row.status === "RUNNING") {
                tpSlOrderMap.set(row.orderId, {
                    orderId: row.orderId,
                    userId: row.userId,
                    symbol: row.symbol,
                    side: row.side,
                    tp: row.tp === null ? null : Number(row.tp),
                    sl: row.sl === null ? null : Number(row.sl),
                    openPrice: Number(row.openPrice ?? 0),
                });
            }
        }

        console.log(`\n> [INFO] (rehydrate.ts) : rehydrated ${result.rowCount} order(s) into book`);
    } catch (error: any) {
        console.log("\n> [ERROR] (rehydrate.ts) :", error.message);
    } finally {
        await pool.end();
    }
}
