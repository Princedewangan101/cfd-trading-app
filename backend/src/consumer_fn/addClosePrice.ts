import { prisma } from "../configs/db.js"
import { redis } from "../configs/redis.js"
import { LedgerTransactionType, OrderStatus, WS_EVENT_TYPES, } from "../../types.js"
import producer from "../kafka/producerInstance.js"


export async function addClosePrice(data: any) {
    // data = {value: {orderId, closingPrice}, task, from}
    const { userId } = req.userId;
    const { value, from } = data

    try {
        const { orderId, closePrice } = value

        if (!orderId || !closePrice || !value || !from) {
            throw new Error(" MISSING REQUIRED DATA !!!");
        }

        const result = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "closePrice" FROM "Order" WHERE "orderId" = ${Number(orderId)} FOR UPDATE`;
            return await tx.$queryRaw`UPDATE "Order" SET "closePrice" = ${Number(closePrice)} WHERE "orderId" = ${Number(orderId)}`;
        });

        if (!result) {
            throw new Error("ORDER NOT FOUND !!!");
        }

        // to notify
        producer.send({
            topic: "trade-result-for-client-fe",
            messages: [{ value: JSON.stringify({ value: { userId_to_notify_cl_update:userId, message: "updated-closing-price" }, event: "ADDED_CLOSE_PRICE", from: "backend" }) }]
        })


    } catch (error) {

    }

}

