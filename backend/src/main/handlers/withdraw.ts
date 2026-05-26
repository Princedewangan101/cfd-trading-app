import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { TransactionType } from '../../type/type.js';
import { IdempotencyCheck } from '../util/IdempotencyCheck.js';

// 1. IDEMPOTENCY CHECK.
// 2. CHECKED THAT USER HAS ENOUGH AVAILABLE BALANCE OR NOT (IF AVAILABLE BALANCE IS NOT IN CACHE THEN, WE FETCH FROM DB AND USE IT, CACHE IT).
// 3. ATOMIC TRANSACTION : DECREMENT AVAILABLE BALANCE IN USER TABLE, RECORD TRANSACTION, CREATE IKEY RECORD.

export async function withdraw(req: Request, res: Response) {
    const userId = "101";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    const isNewRequest = await redis.set(`withdraw${ikey}`, "LOCKED", "EX", 300, "NX");
    IdempotencyCheck(res, "withdraw", isNewRequest, ikey, userId)

    try {
        const isAvailableBalanceInCache = await redis.get(`availableBalance:${userId}`);

        let availableBalance;

        isAvailableBalanceInCache ?
            availableBalance = Number(isAvailableBalanceInCache)
            :
            availableBalance = Number(await prisma.user.findUnique({ where: { userId }, select: { availableBalance: true } }))
        await redis.set(`availableBalance:${userId}`, amount, "EX", 3600);

        if (Number(availableBalance) < amount) {
            setIdemResponse(ikey, userId, "insufficient balance");
            return res.status(400).json({ success: false, message: "insufficient balance" });
        }

        const result = await prisma.$transaction(async (tx: any) => {
            tx.user.$queryRaw(`SELECT * FROM User WHERE userId = ${userId} FOR UPDATE`);
            const availableBalance = await tx.user.update({ where: { userId }, data: { availableBalance: { decrement: amount } } });
            await redis.decrby(`availableBalance:${userId}`, String(availableBalance));

            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: null, type: TransactionType.WITHDRAW }
            });
            await tx.ikey.create({
                data: { ikey, userId, response: JSON.stringify({ response: transactionResult }) }
            });
            return transactionResult;
        })
        if (!result) {
            setIdemResponse(ikey, userId, 'failed to withdraw !');
            res.status(400).json({ success: false, message: "failed to withdraw !" });
        }
        res.status(400).json({ success: true, transactionId: result.transactionId, message: "failed to withdraw !" });
    } catch (error: any) {
        console.log("withdraw ERROR : ", error.message);
        await redis.set(`withdraw${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`);
        res.status(500).json({ success: false, message: "server error !" });
    }
}