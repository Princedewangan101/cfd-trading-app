import { connect, type ConnectionOptions, type NatsConnection } from "nats";

const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";
const NATS_USER = process.env.NATS_USER;
const NATS_PASS = process.env.NATS_PASS;

let nc: NatsConnection | null = null;

function connectionOptions(): ConnectionOptions {
    if (process.env.NODE_ENV === "production" && (!NATS_USER || !NATS_PASS)) {
        throw new Error("NATS_USER and NATS_PASS must be set in production");
    }
    const options: ConnectionOptions = { servers: NATS_URL };
    if (NATS_USER) options.user = NATS_USER;
    if (NATS_PASS) options.pass = NATS_PASS;
    return options;
}

export async function getNats(): Promise<NatsConnection> {
    if (nc) return nc;
    nc = await connect(connectionOptions());
    console.log(`> connected to NATS at ${NATS_URL}`);
    return nc;
}

export async function drainNats(): Promise<void> {
    if (nc) {
        await nc.drain();
        await nc.close();
    }
}
