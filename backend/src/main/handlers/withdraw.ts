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
        const checkResponse = await check(res, ikey, userId, "withdraw");
        if (!checkResponse) {
            return res.status(400).json({ success: false, message: "Failed in idempotency check." })
        } else {
            switch (checkResponse.responseType) {
                case "firstRequest":
                    console.log("\n> 'firstRequest' ");
                    break;

                case "alreadyHaveResponse":
                    console.log("\n> 'alreadyHaveResponse'\n> ", { success: true, response: checkResponse.response });
                    return res.status(200).json({ success: true, response: checkResponse.response });

                case "duplicateRequest":
                    console.log("\n> 'duplicateRequest'\n> ", { success: false, message: "Duplicate request." });
                    return res.status(400).json({ success: false, message: "Duplicate request." });

                default:
                    break;
            }
        }

        // FETCHING ... BALANCE
        const isBalanceInCache = await redis.get(`balance:${userId}`);
        console.log("\n> isBalanceInCache (GET FROM CACHE) :", isBalanceInCache ? isBalanceInCache : "NO BAL IN CACHE");

        let balance;

        if (isBalanceInCache) {
            balance = Number(isBalanceInCache)
        } else {
            const balanceQuery = await prisma.user.findUnique({ where: { userId }, select: { balance: true } })
            if (!balanceQuery) {
                return res.status(404).json({ success: false, message: "" });
            }
            balance = Number(balanceQuery.balance)
        }

        // CHAECKING BAL SUFFICENCY
        if (Number(balance) < Number(amount)) {
            await setIdemResponse(ikey, userId, `Insufficient balance`);
            return res.status(400).json({ success: false, message: "Insufficient balance." });
        }

        // TRANSACTION
        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({ where: { userId }, data: { balance: { decrement: Number(amount) } } });

            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: "-", type: TransactionType.WITHDRAW, amount }
            });
            return { transactionId: transactionResult.transactionId, balance: updateBalanceResult.balance };
        }, {
            maxWait: 5000,
            timeout: 10000,
        })

        if (!result) {
            await setIdemResponse(ikey, userId, "Failed to withdraw.");
            return res.status(400).json({ success: false, message: "Failed to withdraw." });
        }
        await setIdemResponse(ikey, userId, `transactionId : ${result.transactionId}`);

        await redis.set(`balance:${userId}`, String(result.balance), "EX", 3600);

        console.log("\n> balance :", result.balance);

        return res.status(200).json({ success: true, transactionId: result.transactionId, message: "Withdrawal successful." });
    } catch (error: any) {
        console.log("\nERROR (withdraw): ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}
