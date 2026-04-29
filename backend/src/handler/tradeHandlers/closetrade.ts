import type { AuthRequest } from "../../../types.js";
import { type Response } from 'express'
import { prisma } from "../../configs/db.js";
import { redis } from "../../configs/redis.js";
import { kafkaProducer } from "../../kafka/producer.js";

export async function closeTrade(req: AuthRequest, res: Response) {
    const userId = req.userId;
    const { idemKey, orderId } = req.body;

    if (!idemKey || !orderId) {
        return res.status(400).json({ error: "MISSING REQUIRED FIELD !" })
    }

    // PRVENTION FROM REPLAY AND RACE COND_1  (DONE APPLYED LOCK)
    const isNewReq = await redis.set(`idem:${idemKey}`, "LOCKED", 'EX', 60, 'NX');
    if (!isNewReq) {
        const cache = await redis.get(`idem:${idemKey}`);
        if (cache !== "LOCKED") {
            res.status(200).json({ data: JSON.stringify({ response: cache }), message: "REQUEST IS PROCESSED !" })
        } else {
            res.status(400).json({ message: "REQUEST IN PROCESS" })
        }
    }
    try {
        const orderSearchResult = await prisma.order.findUnique({
            where: {
                orderId: Number(orderId)
            }
        })
        if (!orderSearchResult) res.status(404).json({ message: "ORDER NOT FOUND !" })

        const { userId, pair, quantity, openPrice, closePrice, pnl, type, createdAt } = orderSearchResult

        const kafkaEvent = { idemKey, orderId, userId, pair, quantity, openPrice, closePrice, pnl, type, createdAt, task: "CLOSE_TRADE" }
        const result = await kafkaProducer(kafkaEvent);

        await prisma.idemKey.create({
            data: {
                idemKey: Number(idemKey),
                userId: Number(result.userId),
                response: result,
            }
        })
        await redis.set(`idem:${idemKey}`, JSON.stringify(result), 'EX', 3600);
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


