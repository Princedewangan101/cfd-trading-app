import { consumerOpts, StorageType, type JsMsg, type NatsConnection } from "nats";
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

const DLQ_STREAM = "DLQ";

async function ensureStreams(nc: NatsConnection) {
    const jsm = await nc.jetstreamManager();
    try {
        await jsm.streams.info("ORDERS");
    } catch {
        await jsm.streams.add({ name: "ORDERS", subjects: ["backend.order.>"], storage: StorageType.File });
        console.log("\n> [INFO] (handler.ts) : created JetStream stream ORDERS on backend.order.>");
    }
    try {
        await jsm.streams.info(DLQ_STREAM);
    } catch {
        await jsm.streams.add({
            name: DLQ_STREAM,
            subjects: [
                "$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.ORDERS.>",
                "$JS.EVENT.ADVISORY.CONSUMER.MSG_TERMINATED.ORDERS.>",
            ],
            storage: StorageType.File,
        });
        console.log(`\n> [INFO] (handler.ts) : created JetStream DLQ stream (${DLQ_STREAM}) for failed deliveries`);
    }
}

export async function setupEventHandler() {
    const nc = await getNats();
    await ensureStreams(nc);

    const opts = consumerOpts();
    opts.durable("backend-orders")
        .deliverTo("backend-orders.deliver")
        .ackExplicit()
        .deliverAll()
        .maxDeliver(3)
        .ackWait(30_000)
        .filterSubject(SUBJECTS.ORDER_EXECUTED)
        .filterSubject(SUBJECTS.ORDER_COMPLETED)
        .manualAck()
        .callback((err, msg) => {
            if (err) {
                console.log("\n> [ERROR] (handler.ts) : jetstream consumer error :", err.message);
                return;
            }
            if (!msg) return;
            handleEvent(msg).catch(error => {
                console.log("\n> [ERROR] (handler.ts) :", error.message);
                msg.nak();
            });
        });

    await nc.jetstream().subscribe("backend.order.>", opts);

    console.log("\n> [INFO] (handler.ts) : NATS JetStream durable consumer 'backend-orders' registered");
}

async function handleEvent(msg: JsMsg) {
    const parsed = JSON.parse(new TextDecoder().decode(msg.data));

    if (msg.subject === SUBJECTS.ORDER_EXECUTED) {
        await handleOrderExecuted(parsed as EventFromEngine);
    } else if (msg.subject === SUBJECTS.ORDER_COMPLETED) {
        await handleOrderCompleted(parsed as EventFromStopOutEngine);
    }

    msg.ack();
}

// { from: "engine", userId: "uuid", orderId: "uuid", openPrice: 2234533 }
async function handleOrderExecuted(parsedResponse: EventFromEngine) {
    await prisma.order.update({
        where: {
            orderId: String(parsedResponse.orderId), userId: String(parsedResponse.userId)
        },
        data: {
            openPrice: Number(parsedResponse.openPrice), status: "RUNNING"
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
            tp: Number(parsedResponse.orderObj.tp), sl: Number(parsedResponse.orderObj.sl), status: "COMPLETED"
        }
    })
    broadcast("orderCompleted", parsedResponse)
}
