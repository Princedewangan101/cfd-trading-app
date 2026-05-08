import { prisma } from "../../config/db.js";

export async function setIdemResponse(ikey: string, userId: string, response: string) {
    return await prisma.ikey.update({
        where: { ikey, userId },
        data: { response }
    })
}