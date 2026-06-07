import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { TransactionType } from '../../type/type.js';
import { check } from '../util/IdempotencyCheck.js';


export async function withdraw(req: Request, res: Response) {
    const userId = "7dda8668-3247-4111-884c-ec8092035851";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { return res.status(404).json({ success: false, message: "Missing required fields !" }) }

    try {
        await check(res, ikey, userId, "withdraw");

        const isAvailableBalanceInCache = await redis.get(`availableBalance:${userId}`);
        console.log("isAvailableBalanceInCache", isAvailableBalanceInCache);

        let availableBalance;

        isAvailableBalanceInCache ?
            availableBalance = Number(isAvailableBalanceInCache)
            :
            availableBalance = Number(await prisma.user.findUnique({ where: { userId }, select: { availableBalance: true } }))

        await redis.set(`availableBalance:${userId}`, String(amount), "EX", 3600);

        if (Number(availableBalance) < Number(amount)) {
            await setIdemResponse(ikey, userId, `Insufficient balance`);
            return res.status(400).json({ success: false, message: "Insufficient balance." });
        }

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({ where: { userId }, data: { availableBalance: { decrement: Number(amount) } } });

            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: "-", type: TransactionType.WITHDRAW, amount }
            });
            return { transactionId: transactionResult.transactionId, availableBalance: updateBalanceResult.availableBalance };
        }, {
            maxWait: 5000,
            timeout: 10000,
        })

        await setIdemResponse(ikey, userId, `transactionId : ${result.transactionId}`);
        console.log('result :', result);
        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);

        if (!result) {
            await setIdemResponse(ikey, userId, "Failed to withdraw.");
            return res.status(400).json({ success: false, message: "Failed to withdraw." });
        }
        return res.status(200).json({ success: true, transactionId: result.transactionId, message: "Withdrawal successful." });
    } catch (error: any) {
        console.log("\nERROR (withdraw): ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}