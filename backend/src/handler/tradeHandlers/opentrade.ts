import type { AuthRequest } from "../../../types.js";
import { type Response } from 'express'
import { prisma } from "../../configs/db.js";
import { redis } from "../../configs/redis.js";
import { kafkaProducer } from "../../kafka/producer.js";

export async function openTrade(req: AuthRequest, res: Response) {
    const userId = req.userId;
    const { idemKey, pair, quantity, openPrice, type, closePrice, pnl } = req.body;

    if (!idemKey || !userId || !pair || !quantity || !openPrice || !type) {
        return res.status(400).json({ error: "MISSING REQUIRED FIELD !" })
    }

    // PRVENTION FROM PREPLAY AND RACE COND_1  (DONE APPLYED LOCK)
    const isNewReq = await redis.set(`idem:${idemKey}`, "LOCKED", 'EX', 60, 'NX');
    if (!isNewReq) {
        const cache = await redis.get(`idem:${idemKey}`);
        if (cache !== "LOCKED") {
            return res.status(200).json({ data: JSON.stringify({ response: cache }), message: "REQUEST IS PROCESSED !" })
        } else {
            return res.status(409).json({ message: "REQUEST IN PROCESS" })
        }
    }
    try {
        const kafkaEventData = {
            idemKey, userId, pair, quantity, openPrice, type, task: "OPEN_TRADE",
            closePrice: closePrice ? closePrice : "NO-CLOSING-PRICE", pnl: pnl ? pnl : 0
        }
        const result = await kafkaProducer(kafkaEventData); 

        return res.status(201).json({ data: result });
    } catch (error: any) {
        console.log('ERROR : ', error.message);
        await redis.del(`idem:${idemKey}`);

        if (error.message === 'CIRCUIT_BREAKER_OPEN') {
            return res.status(503).json({ error: "ENGINE_BUSY", message: "Please try again in 30 seconds." });
        }

        res.status(500).json({ error: "INTERNAL SERVER ERROR" })
    }
}

