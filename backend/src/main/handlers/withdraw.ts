import { type Request, type Response } from 'express';
import Decimal from 'decimal.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { TransactionType } from '@cfd/contracts';
import { applyBalanceDelta, getCachedBalance, setBalanceCache } from '../services/balanceService.js';

export async function withdraw(req: Request, res: Response) {
    console.log("\n\n>> /api/withdraw");

    const userId = req.userId;
    const { ikey, amount } = req.body;

    try {
        const balance = await getCachedBalance(userId);
        if (balance === null) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (new Decimal(balance).lt(amount)) {
            await setIdemResponse(ikey, userId, `Insufficient balance`);
            return res.status(400).json({ success: false, message: "Insufficient balance." });
        }

        const result = await prisma.$transaction(async (tx: any) => {
            const newBalance = await applyBalanceDelta(tx, userId, -Number(amount));
            const transactionResult = await tx.transaction.create({
                data: { userId, orderId: "-", type: TransactionType.WITHDRAW, amount }
            });
            return { transactionId: transactionResult.transactionId, balance: newBalance };
        }, {
            maxWait: 5000,
            timeout: 10000,
        })

        if (!result) {
            await setIdemResponse(ikey, userId, "Failed to withdraw.");
            return res.status(500).json({ success: false, message: "Failed to withdraw." });
        }
        await setIdemResponse(ikey, userId, `transactionId : ${result.transactionId}`);

        await setBalanceCache(userId, result.balance);

        console.log("\n> balance :", result.balance);

        return res.status(200).json({ success: true, transactionId: result.transactionId, message: "Withdrawal successful." });
    } catch (error: any) {
        console.log("\nERROR (withdraw): ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`);
        return res.status(500).json({ success: false, message: `Server error !` });
    }
}
