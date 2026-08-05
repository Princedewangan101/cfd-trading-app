import { connect, type NatsConnection } from "nats";

const NATS_URL = process.env.NATS_URL || "nats://localhost:4222";

let nc: NatsConnection | null = null;

export async function getNats(): Promise<NatsConnection> {
    if (nc) return nc;
    nc = await connect({ servers: NATS_URL });
    console.log(`> connected to NATS at ${NATS_URL}`);
    return nc;
}

export async function natsRequest<T = unknown>(subject: string, payload: unknown, timeout = 5000): Promise<T> {
    const conn = await getNats();
    const res = await conn.request(subject, JSON.stringify(payload), { timeout });
    return JSON.parse(res.data.toString()) as T;
}

export async function drainNats(): Promise<void> {
    if (nc) {
        await nc.drain();
        await nc.close();
    }
}
