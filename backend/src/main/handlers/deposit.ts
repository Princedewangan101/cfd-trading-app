import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/updateIkey.js';
import { TransactionType } from '../../type/type.js';



export async function deposit(req: Request, res: Response) {
    const userId = "101";
    const { ikey, amount } = req.body;
    if (!ikey || !userId || !amount) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    // IDEMPOTENCY-CHECK
    const isNewRequest = await redis.set(`deposit${ikey}`, "LOCKED", "NX", "EX", 300);
    if (!isNewRequest) {
        const response = await redis.get(`deposit${ikey}`)
        if (response !== "LOCKED") {
            res.status(200).json({ success: true, data: JSON.parse(response) })
        } else {
            res.status(400).json({ success: false, message: "duplicate request !" })
        }
    }
    try {
        // 
        const result = await prisma.$transaction(async (tx: any) => {
            await tx.ikey.create({
                data: { ikey, userId, response: "LOCKED" }
            })
            return await tx.transaction.create({
                data: { userId, orderId: null, type: TransactionType.DEPOSIT }
            })
        })
        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to deposit !')
            res.status(404).json({ success: false, message: "failed to deposit !" })
        }
        await redis.incby(`AVAILABLE-BALANCE-${userId}`, amount)
        res.status(400).json({ success: true, transactionId: result.transactionId, message: "failed to deposit !" })
    } catch (error: any) {
        console.log("deposit ERROR : ", error.message);
        await redis.set(`deposit${ikey}`, `${error.message}`);
        await setIdemResponse(ikey, userId, `${error.message}`);
        res.status(500).json({ success: false, message: "server error !" });
    }
}



