import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { TransactionType } from '../../type/type.js';

export async function withdraw(req: Request, res: Response) {
    const userId = "101";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    // IDEMPOTENCY-CHECK
    const isNewRequest = await redis.set(`withdraw${ikey}`, "LOCKED", "NX", "EX", 300);
    if (!isNewRequest) {
        const response = await redis.get(`withdraw${ikey}`)
        if (response !== "LOCKED") {
            res.status(200).json({ success: true, data: JSON.parse(response) })
        } else {
            res.status(400).json({ success: false, message: "duplicate request !" })
        }
    }
    try {
        const availableBalance = await redis.get(`AVAILABLE-BALANCE-${userId}`);

        if (Number(availableBalance) < amount) {
            setIdemResponse(ikey, userId, "insufficient balance")
            return res.status(400).json({ success: false, message: "insufficient balance" })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.ikey.create({
                data: { ikey, userId, response: "LOCKED" }
            })
            return await tx.transaction.create({
                data: { userId, orderId: null, type: TransactionType.WITHDRAW }
            })
        })
        if (!result) {
            setIdemResponse(ikey, userId, 'failed to withdraw !')
            res.status(404).json({ success: false, message: "failed to withdraw !" })
        }
        await redis.decrby(`LOCK-BALANCE-${userId}`, amount)
        res.status(400).json({ success: true, transactionId: result.transactionId, message: "failed to withdraw !" })
    } catch (error: any) {
        console.log("withdraw ERROR : ", error.message);
        await redis.set(`withdraw${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`);
        res.status(500).json({ success: false, message: "server error !" });
    }
}