import { z } from "zod";

export const sideSchema = z.enum(["BUY", "SELL"]);

export const symbolSchema = z.string().min(3).max(12).regex(/^[A-Za-z0-9]+USD$/i, "invalid symbol");

export const marketOrderSchema = z.object({
    ikey: z.string().min(1),
    symbol: symbolSchema,
    side: sideSchema,
    quantity: z.coerce.number().positive(),
    leverage: z.coerce.number().positive(),
});

export const limitOrderSchema = z.object({
    ikey: z.string().min(1),
    symbol: symbolSchema,
    side: sideSchema,
    price: z.coerce.number().positive(),
    quantity: z.coerce.number().positive(),
    leverage: z.coerce.number().positive(),
});

export const depositSchema = z.object({
    ikey: z.string().min(1),
    amount: z.coerce.number().positive(),
});

export const withdrawSchema = depositSchema;

export const closeOrderSchema = z.object({
    orderId: z.string().min(1),
});

export const modifySchema = z.object({
    orderId: z.string().min(1),
    tp: z.coerce.number().positive().optional(),
    sl: z.coerce.number().positive().optional(),
}).superRefine((data, ctx) => {
    if (data.tp === undefined && data.sl === undefined) {
        ctx.addIssue({ code: "custom", path: ["tp"], message: "Provide at least one of tp or sl." });
    }
});

export const candlesParamsSchema = z.object({
    symbol: z.string().regex(/^[A-Z0-9]+_[A-Z0-9]+$/, "invalid symbol"),
    timeFrame: z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1month"]),
});