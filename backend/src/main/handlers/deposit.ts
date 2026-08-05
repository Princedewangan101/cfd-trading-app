import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { TransactionType } from '@cfd/contracts';
import { applyBalanceDelta, setBalanceCache } from '../services/balanceService.js';

export async function deposit(req: Request, res: Response) {
    console.log("\n\n>> /api/deposit");

    const userId = req.userId;
    const { ikey, amount } = req.body;

    if (!ikey || !userId || !amount) {
        console.log("\n> ------- ERROR : Missing required fields !");
        return res.status(404).json({ success: false, message: "Missing required fields !" })
    }

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const balance = await applyBalanceDelta(tx, userId, Number(amount));
            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: "-", amount: Number(amount), type: TransactionType.DEPOSIT }
            });
            return { transactionId: transactionResult.transactionId, balance };
        }, {
            maxWait: 5000,
            timeout: 10000
        })

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to deposit')
            return res.status(400).json({ success: false, message: "Failed to deposit." })
        }

        await setBalanceCache(userId, result.balance);

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
