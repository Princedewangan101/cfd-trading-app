import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { TransactionType } from '../../type/type.js';
import { check } from '../util/IdempotencyCheck.js';



export async function deposit(req: Request, res: Response) {

    const userId = "7dda8668-3247-4111-884c-ec8092035851";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { return res.status(404).json({ success: false, message: "Missing required fields !" }) }

    try {
        await check(res, ikey, userId, "deposit")

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { increment: amount } }
            });
            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: "-", amount, type: TransactionType.DEPOSIT }
            });
            return { transactionId: transactionResult.transactionId, availableBalance: updateBalanceResult.availableBalance };
        }, {
            maxWait: 5000,
            timeout: 10000
        })

        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to deposit')
            return res.status(400).json({ success: false, message: "Failed to deposit." })
        }

        await setIdemResponse(ikey, userId, result.transactionId);
        console.log("------------------completed");

        return res.status(200).json({ success: true, transactionId: result.transactionId, message: "Deposit successful." })

    } catch (error: any) {
        console.log("\nERROR (deposit) : ", error.message);
        await redis.set(`deposit${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`);
        console.log("------------------error");
        return res.status(500).json({ success: false, message: `${error.message}` });
    }
}



