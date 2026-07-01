import { response, type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';

export async function balance(req: Request, res: Response) {
    console.log("\n\n>> /api/balance (api call)");

    // const userId = req.userId;
    const userId = "72c62fec-64a7-4b7f-89b4-e0e0ad2c2a25";
    console.log("\n> userId :", userId);

    if (typeof userId !== 'string') {
        return res.status(400).json({ success: false, message: "Invalid required feild !" });
    }
    if (!userId) {
        return res.status(404).json({ success: false, message: "Missing required fields !" });
    }

    try {
        const totalBalance = await redis.get(`totalBalance:${userId}`);
        console.log("\n> totalBalance (GET FROM CACHE) :", totalBalance ? totalBalance : "BAL NOT IN CACHE.");

        if (totalBalance) {
            const availableBalance = await redis.get(`availableBalance:${userId}`);
            const lockedBalance = await redis.get(`lockedBalance:${userId}`);
            if (!availableBalance || !lockedBalance) {
                return res.status(404).json({ success: false, message: "Balance not found !" });
            }
            const parseTotalBalance = JSON.parse(totalBalance);
            const parseAvailableBalance = JSON.parse(availableBalance);
            const parseLockedBalance = JSON.parse(lockedBalance);

            console.log("\n> parseTotalBalance :", parseTotalBalance);

            return res.status(200).json({ success: true, totalBalance: Number(parseTotalBalance), availableBalance: Number(parseAvailableBalance), lockedBalance: Number(parseLockedBalance) });
        } else {
            console.log("\n> FETCHING DB....");
            const result = await prisma.user.findUnique({
                where: { userId },
                select: { availableBalance: true, lockedBalance: true }
            })
            if (!result) {
                return res.status(404).json({ success: false, message: "Failed to get balance." });
            }

            const totalBalance = Number(result.availableBalance) + Number(result.lockedBalance)
            console.log("\n> totalBalance (FETCH FROM DB) :", totalBalance);

            await redis.set(`totalBalance:${userId}`, `${totalBalance}`, "EX", 3600);
            await redis.set(`availableBalance:${userId}`, `${result.availableBalance}`, "EX", 3600);
            await redis.set(`lockedBalance:${userId}`, `${result.lockedBalance}`, "EX", 3600);
            return res.status(200).json({ success: true, totalBalance: totalBalance, availableBalance: result.availableBalance, lockedBalance: result.lockedBalance });

            // const result = await prisma.transaction.aggregate({
            //     where: { userId },
            //     _sum: { amount: true }
            // })
            // await redis.set(`totalBalance:${userId}`, `${result._sum.amount}`, "EX", 3600);
            // return res.status(200).json({ success: true, totalBalance: result._sum.amount });
        }
    } catch (error: any) {
        console.log(">> ERROR (getBalance) : ", error.message);
        return res.status(500).json({ success: false, message: "server error !" });
    }
} 