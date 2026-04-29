import type { AuthRequest } from "../../../types.js";
import { type Response } from 'express';
import { redis } from "../../configs/redis.js";
import { prisma } from "../../configs/db.js";
import producer from "../../kafka/producerInstance.js";

export async function withdraw(req: AuthRequest, res: Response) {
    const { userId } = req.userId;
    const { idemKey, amount } = req.body;

    if (!idemKey || !userId || !amount) {
        return res.status(400).json({ error: "MISSING REQUIRED FIELD !" })
    }

    // PRVENTION FROM PREPLAY AND RACE COND_1  (DONE APPLYED LOCK)
    const isNewReq = await redis.set(`deposit-idem:${idemKey}`, "LOCKED", 'EX', 60, 'NX');
    if (!isNewReq) {
        const cache = await redis.get(`idem:${idemKey}`);
        if (cache !== "LOCKED") {
            return res.status(200).json({ data: JSON.stringify({ response: cache }), message: "REQUEST IS PROCESSED !" })
        } else {
            return res.status(409).json({ message: "REQUEST IN PROCESS" })
        }
    }
    try {

        const result = await prisma.$transaction(async (tx) => {
            await tx.ledger.create({
                data: {
                    userId: Number(userId),
                    transactionAmount: - Math.abs(Number(amount))
                }
            })
            await tx.idemKey.create({
                data: {
                    idemKey: Number(idemKey),
                    userId: Number(userId),
                    response: "amount withdrawn"
                }
            })

            await redis.set(`deposit-idem:${idemKey}`, "amount withdrawn")

            return "amount withdrawn success"
        })

        res.status(200).json({message: result})
    } catch (error: any) {
        console.log('ERROR : ', error.message);
        await redis.del(`deposit-idem:${idemKey}`);
        res.status(500).json({ error: "INTERNAL SERVER ERROR" })
    }
}