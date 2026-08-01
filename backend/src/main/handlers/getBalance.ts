import { type Request, type Response } from 'express';
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
        const balance = await redis.get(`balance:${userId}`);
        console.log("\n> balance (GET FROM CACHE) :", balance ? balance : "BAL NOT IN CACHE.");

        if (balance) {
            const parseBalance = JSON.parse(balance);

            console.log("\n> parseBalance :", parseBalance);

            return res.status(200).json({ success: true, balance: Number(parseBalance) });
        } else {
            console.log("\n> FETCHING DB....");
            const result = await prisma.user.findUnique({
                where: { userId },
                select: { balance: true }
            })
            if (!result) {
                return res.status(404).json({ success: false, message: "Failed to get balance." });
            }

            console.log("\n> balance (FETCH FROM DB) :", result.balance);

            await redis.set(`balance:${userId}`, `${result.balance}`, "EX", 3600);
            return res.status(200).json({ success: true, balance: result.balance });
        }
    } catch (error: any) {
        console.log(">> ERROR (getBalance) : ", error.message);
        return res.status(500).json({ success: false, message: "server error !" });
    }
} 
