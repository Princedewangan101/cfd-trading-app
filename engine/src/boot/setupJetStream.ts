import { StorageType, type NatsConnection } from "nats";

// Creates the ORDERS JetStream stream idempotently (engine is the producer).
export async function ensureOrdersStream(nc: NatsConnection): Promise<void> {
    const jsm = await nc.jetstreamManager();
    try {
        await jsm.streams.info("ORDERS");
        console.log("\n> [INFO] (setupJetStream.ts) : stream ORDERS already exists");
    } catch {
        await jsm.streams.add({ name: "ORDERS", subjects: ["backend.order.>"], storage: StorageType.File });
        console.log("\n> [INFO] (setupJetStream.ts) : created JetStream stream ORDERS on backend.order.>");
    }
}
