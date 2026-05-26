import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { TransactionType } from '../../type/type.js';
import { depositeHandlerIdempotencyCheck } from '../util/depositeHandlerIdempotencyCheck.js';



export async function deposit(req: Request, res: Response) {
    const userId = "101";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    // IDEMPOTENCY-CHECK
    const isNewRequest = await redis.set(`deposit${ikey}`, "LOCKED", "EX", 300, "NX");
    depositeHandlerIdempotencyCheck(res, isNewRequest, ikey, userId)
    try {
        const result = await prisma.$transaction(async (tx: any) => {
            tx.user.$queryRaw(`SELECT * FROM User WHERE userId = ${userId} FOR UPDATE`);
            tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { increment: amount } }
            });
            await redis.set(`availableBalance:${userId}`, amount, "EX", 900);
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
        // await redis.incrby(`AVAILABLE-BALANCE-${userId}`, amount)
        return res.status(400).json({ success: true, transactionId: result.transactionId, message: "deposit successful" })
    } catch (error: any) {
        console.log("deposit ERROR : ", error.message);
        await redis.set(`deposit${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`);
        return res.status(500).json({ success: false, message: "server error !" });
    }
}



