import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { TransactionType } from '../../type/type.js';
import { IdempotencyCheck } from '../util/IdempotencyCheck.js';

// 1. IDEMPOTENCY CHECK.
// 3. ATOMIC TRANSACTION : INCREMENT AVAILABLE BALANCE IN USER TABLE, RECORD TRANSACTION, CREATE IKEY RECORD.

export async function deposit(req: Request, res: Response) {
    const userId = "101";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    const isNewRequest = await redis.set(`deposit${ikey}`, "LOCKED", "EX", 300, "NX");
    IdempotencyCheck(res, "deposit", isNewRequest, ikey, userId)

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            await tx.user.$queryRaw(`SELECT * FROM User WHERE userId = ${userId} FOR UPDATE`);
            const availableBalance = await tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { increment: amount } }
            });
            await redis.set(`availableBalance:${userId}`, String(availableBalance) , "EX", 3600);
            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: null, amount, type: TransactionType.DEPOSIT }
            });
            await tx.ikey.create({
                data: { ikey, userId, response: JSON.stringify({ transactionResult }) }
            });
            return transactionResult;
        })
        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to deposit !')
            return res.status(400).json({ success: false, message: "failed to deposit !" })
        }
        return res.status(400).json({ success: true, transactionId: result.transactionId, message: "deposit successful" })
    } catch (error: any) {
        console.log("deposit ERROR : ", error.message);
        await redis.set(`deposit${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`);
        return res.status(500).json({ success: false, message: "server error !" });
    }
}



