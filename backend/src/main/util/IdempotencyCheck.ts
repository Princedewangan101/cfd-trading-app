import { type Response } from 'express';
import { prisma } from "../../config/db.js";
import { redis } from "../../config/redis.js";
import { setIdemResponse } from './IdempotencyResponseUpdate.js';


export async function check(res: Response, ikey: string, userId: string, keyHolder: string) {
    const cacheResponse = await redis.exists(`${keyHolder}${ikey}`);
    let iKeyResponse;
    let dbResponseObj;
    console.log("cacheResponse : ", cacheResponse);

    cacheResponse === 1 ?
        iKeyResponse = await redis.get(`${keyHolder}${ikey}`)
        :
        dbResponseObj = await prisma.iKey.findFirst({
            where: { ikey, userId },
        })

    if (cacheResponse === 0 && !dbResponseObj) {

        console.log("FIRST REQ");
        await redis.set(`${keyHolder}${ikey}`, "first-req-running", "EX", 300)
        await setIdemResponse(ikey, userId, "first-req-running")
        return true;

    } else if (cacheResponse === 0 && dbResponseObj?.response === "first-req-running") {

        return res.status(400).json({ success: false, message: "Duplicate request." });

    } else if (cacheResponse === 0 && dbResponseObj?.response !== "first-req-running") {

        if (!dbResponseObj) { return }
        await redis.set(`${keyHolder}${ikey}`, dbResponseObj.response, "EX", 300)
        return res.status(200).json({ success: true, response: dbResponseObj?.response });

    } else if (cacheResponse === 1 && iKeyResponse === "first-req-running") {

        console.log("DUPLICATE REQ");
        return res.status(400).json({ success: false, message: "Duplicate request." });

    } else if (cacheResponse === 1 && iKeyResponse !== "first-req-running") {

        console.log("REQ ALREADY COMPLETED");
        if (!iKeyResponse) { return }
        await redis.set(`${keyHolder}${ikey}`, iKeyResponse, "EX", 300)
        return res.status(200).json({ success: true, response: iKeyResponse });

    }
}