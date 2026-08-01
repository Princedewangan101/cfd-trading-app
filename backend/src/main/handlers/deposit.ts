import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { TransactionType } from '../../type/type.js';
import { check } from '../util/IdempotencyCheck.js';

// - ADDING DEPOSIT IN TRAN RECORD & INCR BAL. IN USER ROW.
// - UPDATING BAL. IN REDIS FOR USER

export async function deposit(req: Request, res: Response) {
    console.log("\n\n>> /api/deposit");

    // const userId = req.userId;
    const userId = "72c62fec-64a7-4b7f-89b4-e0e0ad2c2a25";
    const { ikey, amount } = req.body;

    if (!ikey || !userId || !amount) {
        console.log("\n> ------- ERROR : Missing required fields !");
        return res.status(404).json({ success: false, message: "Missing required fields !" })
    }

    try {
        const checkResponse = await check(res, ikey, userId, "deposit")
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

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({
                where: { userId: String(userId) },
                data: { balance: { increment: Number(amount) } }
            });
            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: "-", amount: Number(amount), type: TransactionType.DEPOSIT }
            });
            return { transactionId: transactionResult.transactionId, balance: updateBalanceResult.balance };
        }, {
            maxWait: 5000,
            timeout: 10000
        })

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to deposit')
            return res.status(400).json({ success: false, message: "Failed to deposit." })
        }

        await redis.set(`balance:${userId}`, String(result.balance), "EX", 3600);

        console.log("\n> balance :", result.balance);

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
