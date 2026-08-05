import { type NextFunction, type Request, type Response } from "express";
import { check } from "../util/IdempotencyCheck.js";

// Runs the idempotency check once and short-circuits duplicate / already-served
// requests, replacing the copy-pasted switch in every handler.
export function idempotency(keyHolder: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ikey = req.body?.ikey;
        const userId = req.userId;

        if (!ikey || !userId) {
            return next();
        }

        let checkResponse;
        try {
            checkResponse = await check(ikey, userId, keyHolder);
        } catch (error: any) {
            // fail-open: let the handler proceed; the DB transaction keeps atomicity
            console.log("\n> [ERROR] (idempotency.ts) :", error.message);
            return next();
        }

        if (!checkResponse) {
            return res.status(400).json({ success: false, message: "Failed in idempotency check." });
        }

        switch (checkResponse.responseType) {
            case "firstRequest":
                return next();
            case "alreadyHaveResponse":
                return res.status(200).json({ success: true, response: checkResponse.response });
            case "duplicateRequest":
                return res.status(400).json({ success: false, message: "Duplicate request." });
            default:
                return next();
        }
    };
}
