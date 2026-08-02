import { prisma } from "../../config/db.js";
import { redis } from "../../config/redis.js";
import { setIdemResponse } from './IdempotencyResponseUpdate.js';

export interface IdempotencyCheckResult {
    responseType: "firstRequest" | "duplicateRequest" | "alreadyHaveResponse";
    response?: string;
}

export async function check(ikey: string, userId: string, keyHolder: string): Promise<IdempotencyCheckResult | undefined> {
    const cacheResponse = await redis.exists(`${keyHolder}${ikey}`);
    let iKeyResponse;
    let dbResponseObj;
    console.log("\n\n> cacheResponse : ", cacheResponse === 0 ? "0 : NO API RES. IN CACHE" : "1 : API RES. IN CACHE");

    cacheResponse === 1 ?
        iKeyResponse = await redis.get(`${keyHolder}${ikey}`)
        :
        dbResponseObj = await prisma.iKey.findFirst({
            where: { ikey, userId },
        })

    if (cacheResponse === 0 && !dbResponseObj) {

        console.log("\n> FIRST-REQ");
        await redis.set(`${keyHolder}${ikey}`, "first-req-running", "EX", 300)
        await setIdemResponse(ikey, userId, "first-req-running")
        return { responseType: "firstRequest" }

    } else if (cacheResponse === 0 && dbResponseObj?.response === "first-req-running") {

        console.log("\n> DUPLICATE REQ");
        return { responseType: "duplicateRequest" }

    } else if (cacheResponse === 0 && dbResponseObj?.response !== "first-req-running") {

        console.log("\n> REQ ALREADY COMPLETED");
        if (!dbResponseObj) { return }
        await redis.set(`${keyHolder}${ikey}`, dbResponseObj.response, "EX", 300)
        return { responseType: "alreadyHaveResponse", response: dbResponseObj.response }

    } else if (cacheResponse === 1 && iKeyResponse === "first-req-running") {

        console.log("\n> DUPLICATE REQ");
        return { responseType: "duplicateRequest" }

    } else if (cacheResponse === 1 && iKeyResponse !== "first-req-running") {

        console.log("\n> REQ ALREADY COMPLETED");
        if (!iKeyResponse) { return }
        await redis.set(`${keyHolder}${ikey}`, iKeyResponse, "EX", 300)
        return { responseType: "alreadyHaveResponse", response: iKeyResponse }

    }
}
