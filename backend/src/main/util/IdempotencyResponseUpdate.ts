import { prisma } from "../../config/db.js";

export async function setIdemResponse(ikey: string, userId: string, response: string) {
    try {
        return await prisma.iKey.upsert({
            where: { ikey, userId },
            update: { response },
            create: { ikey, userId, response }
        })
    } catch (error:any) {
        console.log("ERROR (idempotencyResponseUpdate.ts) :", error.message);
    }
}