import { response, type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';

export async function balance(req: Request, res: Response) {
    const userId = "101";
    if (!userId) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    try {
        const result = await prisma.transaction.agregate({
            where: { userId },
            _sum: { amount: true }
        })
        await redis.set(`TOTAL-BALANCE-${userId}`, `${result._sum.amount}`)

        res.status(200).json({ success: true, totalBalance: result._sum.amount })

    } catch (error: any) {
        console.log("deposit ERROR : ", error.message);
        res.status(500).json({ success: false, message: "server error !" });
    }
} 