import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { TransactionType } from '../../type/type.js';
import { check } from '../util/IdempotencyCheck.js';


export async function withdraw(req: Request, res: Response) {
    console.log("\n\n>> /api/withdraw");

    // const userId = req.userId;
    const userId = "72c62fec-64a7-4b7f-89b4-e0e0ad2c2a25";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { return res.status(404).json({ success: false, message: "Missing required fields !" }) }

    try {
        await check(res, ikey, userId, "withdraw");

        // FETCHING ... LOCKED BALANCE
        let lockedBalance;
        lockedBalance = await redis.get(`lockedBalance:${userId}`);
        console.log(`\n> lockedBalance (GET FROM CACHE) : ${lockedBalance}`);

        if (!lockedBalance) {
            const lockedBalanceQuery = await prisma.user.findUnique({
                where: {
                    userId: String(userId)
                },
                select: { lockedBalance: true }
            })
            if (!lockedBalanceQuery) {
                console.log("\n> ------- ERROR : Failed to get locked balance. !");
                return res.status(404).json({ success: false, message: "Failed to get locked balance." })
            }
            lockedBalance = lockedBalanceQuery.lockedBalance
            await redis.set(`lockedBalance:${userId}`, String(lockedBalance), "EX", 3600)
            console.log(`\n> lockedBalance (FETCH FROM DB) : ${lockedBalance}`);
        }

        // FETCHING ... AVA. BAL.
        const isAvailableBalanceInCache = await redis.get(`availableBalance:${userId}`);
        console.log("\n> isAvailableBalanceInCache (GET FROM CACHE) :", isAvailableBalanceInCache ? isAvailableBalanceInCache : "NO BAL IN CACHE");

        let availableBalance;

        if (isAvailableBalanceInCache) {
            availableBalance = Number(isAvailableBalanceInCache)
        } else {
            const availableBalanceQuery = await prisma.user.findUnique({ where: { userId }, select: { availableBalance: true } })
            if (!availableBalanceQuery) {
                return res.status(404).json({ success: false, message: "" });
            }
            availableBalance = Number(availableBalanceQuery.availableBalance)
        }

        // CHAECKING BAL SUFFICENCY
        if (Number(availableBalance) < Number(amount)) {
            await setIdemResponse(ikey, userId, `Insufficient balance`);
            return res.status(400).json({ success: false, message: "Insufficient balance." });
        }

        // TRANSACTION
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

        if (!result) {
            await setIdemResponse(ikey, userId, "Failed to withdraw.");
            return res.status(400).json({ success: false, message: "Failed to withdraw." });
        }
        await setIdemResponse(ikey, userId, `transactionId : ${result.transactionId}`);

        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);

        const totalBalance = String(Number(result.availableBalance) + Number(lockedBalance))
        await redis.set(`totalBalance:${userId}`, totalBalance, "EX", 3600)

        console.log("\n> total bal :", totalBalance);
        console.log("\n> ava bal :", result.availableBalance);
        console.log("\n> lock bal :", lockedBalance);

        return res.status(200).json({ success: true, transactionId: result.transactionId, message: "Withdrawal successful." });
    } catch (error: any) {
        console.log("\nERROR (withdraw): ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}