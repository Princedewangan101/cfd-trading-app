import { type Request, type Response, type NextFunction } from 'express';
import type { z } from 'zod';

type Source = "body" | "params";

export function validateBody<T>(schema: z.ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request.",
                errors: parsed.error.flatten(),
            });
        }
        req.body = parsed.data;
        next();
    };
}

export function validateParams<T>(schema: z.ZodType<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.params);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request.",
                errors: parsed.error.flatten(),
            });
        }
        req.params = parsed.data as Request["params"];
        next();
    };
}