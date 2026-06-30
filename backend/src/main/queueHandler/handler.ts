import { prisma } from "../../config/db";
import { redis } from "../../config/redis";

while (true) {
    queueHandler()
}

async function queueHandler() {
    try {
        const queueResponse = await redis.rpop("updateOrder")
        if (!queueResponse) {
            console.log("> queueResponse is empty");
        } else {
            const parsedResponse = JSON.parse(queueResponse)
            if (!parsedResponse) {
                throw new Error("queueResponse is not parsed.");
            }

            switch (parsedResponse.from) {
                case "engine":
                    engine(parsedResponse)
                    break;

                case "orderCloseEngine":
                    stopOutEngine(parsedResponse)
                    break;

                default:
                    break;
            }
        }
    } catch (error: any) {
        console.log("ERROR : ", error.message);
    }
}

interface ParseResponseFromEngine {
    from: string,
    orderId: string,
    userId: string,
    openPrice: number
}

// parsedResponse = { from: "engine", userId: "uuid", orderId: "uuid", openPrice: 2234533 }
async function engine(parsedResponse: ParseResponseFromEngine) {
    await prisma.order.update({
        where: {
            orderId: String(parsedResponse.orderId), userId: String(parsedResponse.userId)
        },
        data: {
            openPrice: Number(Number(parsedResponse.openPrice) / 100), status: "EXECUTED"
        }
    })
}

interface ParseResponseFromStopOutEngine {
    from: string,
    orderObj: {
        tp: number,
        sl: number,
        symbol: string,
        side: string,
        orderId: string,
        userId: string
    }
}

// parsedResponse = {from:"orderCloseEngine", orderObj:{tp:23303, sl:23303, symbol:"SOLUSD",side:"BUY"/"SIDE", orderId:"uuid", userId:"uuid"}}
async function stopOutEngine(parsedResponse: ParseResponseFromStopOutEngine) {
    await prisma.order.update({
        where: {
            orderId: String(parsedResponse.orderObj.orderId), userId: String(parsedResponse.orderObj.userId)
        },
        data: {
            tp: Number(Number(parsedResponse.orderObj.tp) / 100), sl: Number(Number(parsedResponse.orderObj.sl) / 100), status: "COMPLETED"
        }
    })
}