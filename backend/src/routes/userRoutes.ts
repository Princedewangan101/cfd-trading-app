import { Router } from 'express'
import type { AuthRequest } from '../../types.js';
import { kafkaProducer } from '../kafka/producer.js';
import { redis } from '../configs/redis.js';
import { prisma } from '../configs/db.js';

const router = Router();

router.post("/createTrade", async (req: AuthRequest, res) => {
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
            res.status(200).json({ data: JSON.stringify({ response: cache }), message: "REQUEST IS PROCESSED !" })
        } else {
            res.status(409).json({ message: "REQUEST IN PROCESS" })
        }
    }
    try {
        const kafkaEventData = {
            idemKey, userId, pair, quantity, openPrice, type, task: "OPEN_TRADE",
            closePrice: closePrice ? closePrice : "NO-CLOSING-PRICE", pnl: pnl ? pnl : 0
        }
        const result = await kafkaProducer(kafkaEventData);

        // PERSIST IDEM KEY KEY TO PREVENT PERMANENT REPLAY PREVENTION.
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
})

router.post("/closeTrade", async (req: AuthRequest, res) => {
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
})

router.get("/balance", async (req: AuthRequest, res) => {
    const userId = req.userId;
    if (!userId) {
        return res.status(400).json({ error: "MISSING REQUIRED FIELD !" })
    }

    try {
        const result = await prisma.user.findUnique({
            where: {
                userId: Number(userId)
            },
            select: {
                balance: true,
            }
        })
        if (!result || result === null) {
            res.status(404).json({ message: "USER_NOT_FOUND" })
        }

        return res.status(200).json({ data: result.balance });

    } catch (error) {
        console.log('ERROR : ', error);
        res.status(500).json({ error: "INTERNAL SERVER ERROR" })
    }
})

export default router

// HAVE TO RUN THIS COMMAND
// docker run -p 2181:2181 zookeeper

// ANOTHER TERMINAL
// docker run -p 9892:9892 \
// -e KAFKA_ZOOKEEPER_CONNECT = <PRIVATE_IP>:2181 \
// -e KAFKA_ADVERTISED_LISTENERS = PLAINTEXT://<PRIVATE_IP>:9092 \
// -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR = 1 \
// confluentinc/cp-kafka