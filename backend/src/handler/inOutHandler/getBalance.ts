import type { AuthRequest } from "../../../types.js";
import { type Response } from 'express';
import { redis } from "../../configs/redis.js";
import { prisma } from "../../configs/db.js";


export async function balance(req: AuthRequest, res: Response) {
    const { userId } = req.userId;

    if (!userId || typeof userId !== "number") {
        return res.status(400).json({ error: "MISSING REQUIRED FIELD !" })
    }
    try {
        const result = await prisma.ledger.aggregate({
            where: { userId },
            _sum: { transactionAmount: true }
        })

        if (!result) {
            return res.status(404).json({ message: "failed to fetch balance !" })
        }
        redis.set(`${userId}_BALANCE :`, JSON.stringify(result._sum.transactionAmount))

        res.status(200).json({ balance: result._sum.transactionAmount })
    } catch (error: any) {
        console.log('ERROR : ', error.message);
        res.status(500).json({ error: "INTERNAL SERVER ERROR" })
    }
}