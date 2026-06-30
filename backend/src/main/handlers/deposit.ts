import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { TransactionType } from '../../type/type.js';
import { check } from '../util/IdempotencyCheck.js';

// - FETCH LOCKED BAL , IF WE DO IT AFTER TRAN. AND THE FETCH REQ FAILS THEN WE HAVE TO REVERT THE TRAN.
// - ADDING DEPOSIT IN TRAN RECORD & INCR AVA. BAL. IN USER ROW.
// - UPDATING TOTAL BAL. IN REDIS FOR USER

export async function deposit(req: Request, res: Response) {
    console.log("\n\n>> /api/deposit");

    const userId = req.userId;
    const { ikey, amount } = req.body;

    if (!ikey || !userId || !amount) {
        console.log("\n> ------- ERROR : Missing required fields !");
        return res.status(404).json({ success: false, message: "Missing required fields !" })
    }

    try {
        await check(res, ikey, userId, "deposit")

        let lockedBalance;
        lockedBalance = await redis.get(`lockedBalance:${userId}`);
        console.log(`\n> lockedBalance (GET FROM CACHE) : ${lockedBalance}`);

        if (!lockedBalance) {
            const lockedBalanceQuery = await prisma.user.findUnique({
                where: {
                    userId: String(userId), select: { lockedBalance: true }
                }
            })
            if (!lockedBalanceQuery) {
                console.log("\n> ------- ERROR : Failed to get locked balance. !");
                return res.status(404).json({ success: false, message: "Failed to get locked balance." })
            }
            lockedBalance = lockedBalanceQuery.lockedBalance
            await redis.set(`lockedBalance:${userId}`, String(lockedBalance), "EX", 3600)
            console.log(`\n> lockedBalance (FETCH FROM DB) : ${lockedBalance}`);
        }

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({
                where: { userId: String(userId) },
                data: { availableBalance: { increment: Number(amount) } }
            });
            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: "-", amount: Number(amount), type: TransactionType.DEPOSIT }
            });
            return { transactionId: transactionResult.transactionId, availableBalance: updateBalanceResult.availableBalance };
        }, {
            maxWait: 5000,
            timeout: 10000
        })

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to deposit')
            return res.status(400).json({ success: false, message: "Failed to deposit." })
        }

        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);

        const totalBalance = String(Number(result.availableBalance) + Number(lockedBalance))
        await redis.set(`totalBalance:${userId}`, totalBalance, "EX", 3600)

        await setIdemResponse(ikey, userId, result.transactionId);
        console.log("------------------ completed");

        return res.status(200).json({ success: true, transactionId: result.transactionId, message: "Deposit successful." })

    } catch (error: any) {
        console.log("\nERROR (deposit) : ", error.message);
        await redis.set(`deposit${ikey}`, `${error.message}`, "EX", 3600);
        await setIdemResponse(ikey, userId, `${error.message}`);
        console.log("------------------ error");
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}



