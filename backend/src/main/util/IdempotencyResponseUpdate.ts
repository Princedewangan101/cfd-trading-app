import { prisma } from "../../config/db.js";

export async function setIdemResponse(ikey: string, userId: string, response: string) {
    return await prisma.iKey.upsert({
        where: { ikey, userId },
        update: { response },
        create: { ikey, userId, response }
    })
}