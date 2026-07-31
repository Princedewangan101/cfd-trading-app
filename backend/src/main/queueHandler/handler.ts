import { prisma } from "../../config/db";
import { getNats } from "../../config/nats";
import { SUBJECTS } from "../../type/type.js";
import { broadcast } from "../sse/sse.js";

interface EventFromEngine {
    from: string,
    orderId: string,
    userId: string,
    openPrice: number
}

interface EventFromStopOutEngine {
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

export async function setupEventHandler() {
    const nc = await getNats();

    nc.subscribe(SUBJECTS.ORDER_EXECUTED, {
        callback: (err, msg) => {
            if (err) return;
            const parsedResponse = JSON.parse(msg.data.toString()) as EventFromEngine;
            if (!parsedResponse) {
                console.log("ERROR : failed to parse engine event.");
                return;
            }
            handleOrderExecuted(parsedResponse).catch(error => {
                console.log("ERROR (ORDER_EXECUTED) :", error.message);
            });
        },
    });

    nc.subscribe(SUBJECTS.ORDER_COMPLETED, {
        callback: (err, msg) => {
            if (err) return;
            const parsedResponse = JSON.parse(msg.data.toString()) as EventFromStopOutEngine;
            if (!parsedResponse) {
                console.log("ERROR : failed to parse engine event.");
                return;
            }
            handleOrderCompleted(parsedResponse).catch(error => {
                console.log("ERROR (ORDER_COMPLETED) :", error.message);
            });
        },
    });

    console.log("> NATS event handlers registered");
}

// { from: "engine", userId: "uuid", orderId: "uuid", openPrice: 2234533 }
async function handleOrderExecuted(parsedResponse: EventFromEngine) {
    await prisma.order.update({
        where: {
            orderId: String(parsedResponse.orderId), userId: String(parsedResponse.userId)
        },
        data: {
            openPrice: Number(Number(parsedResponse.openPrice) / 100), status: "EXECUTED"
        }
    })
    broadcast("orderExecuted", parsedResponse)
}

// {from:"engine", orderObj:{tp:23303, sl:23303, symbol:"SOLUSD",side:"BUY"/"SELL", orderId:"uuid", userId:"uuid"}}
async function handleOrderCompleted(parsedResponse: EventFromStopOutEngine) {
    await prisma.order.update({
        where: {
            orderId: String(parsedResponse.orderObj.orderId), userId: String(parsedResponse.orderObj.userId)
        },
        data: {
            tp: Number(Number(parsedResponse.orderObj.tp) / 100), sl: Number(Number(parsedResponse.orderObj.sl) / 100), status: "COMPLETED"
        }
    })
    broadcast("orderCompleted", parsedResponse)
}
