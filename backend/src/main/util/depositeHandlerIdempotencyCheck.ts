import { type Response } from 'express';
import { prisma } from "../../config/db.js";
import { redis } from "../../config/redis.js";

export async function depositeHandlerIdempotencyCheck(res: Response, isNewRequest: any, ikey: string, userId: string) {
    if (!isNewRequest) {
        const response = await redis.get(`deposit${ikey}`)
        if (response !== "LOCKED") {
            if (!response) {
                const responseFetchedFromDb = await prisma.ikey.findUnique({ where: { userId, ikey }, select: { response: true } })
                await redis.set(`deposit${ikey}`, JSON.parse(responseFetchedFromDb), "EX", 300, "NX");
                return res.status(404).json({ success: false, data: JSON.parse(responseFetchedFromDb) })
            } else {
                return res.status(200).json({ success: true, data: JSON.parse(response) })
            }
        } else {
            return res.status(400).json({ success: false, message: "duplicate request !" })
        }
    }
}