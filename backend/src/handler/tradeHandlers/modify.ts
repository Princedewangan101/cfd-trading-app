import type { AuthRequest } from "../../../types.js";
import { type Response } from 'express'
import { redis } from "../../configs/redis.js";
import producer from "../../kafka/producerInstance.js";

export async function openTrade(req: AuthRequest, res: Response) {
    const userId = req.userId;
    const { idemKey, orderId, closeprice } = req.body;

    if (!idemKey || !orderId || !closeprice) {
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

        let price = await redis.get(`cl${orderId}`)
        if (!price) { return res.status(404).json({ error: "PRICE NOT FOUND !" }) }

        if (price.closePrice === 'NO_CLOSING_PRICE') {
            producer.send({
                topic: 'order-matching-result',
                messages: [{
                    value: JSON.stringify({ value: { orderId, closeprice }, task: ADD_CLOSING_PRICE, from: backend })
                }]
            })
            await redis.set(`cl${orderId}`, closeprice)
        }

    } catch (error: any) {
        console.log('ERROR: ', error.message);
        return res.status(404).json({ error: "INTERNAL SERVER ERROR !" })
    }
}

