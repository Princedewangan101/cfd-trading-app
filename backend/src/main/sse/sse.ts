import { type Request, type Response } from "express";
import { redis } from "../../config/redis.js";

const clients = new Map<string, Set<Response>>();
const eventIdCounter = new Map<string, number>();
const LAST_EVENT_ID_PREFIX = "sse:lastEventId:";
const NOTIFICATION_LIST_PREFIX = "notifications:";
const OFFLINE_LIST_MAX = 50;

export function addClient(userId: string, res: Response) {
    const userClients = clients.get(userId) ?? new Set<Response>();
    userClients.add(res);
    clients.set(userId, userClients);
    res.on("close", () => {
        userClients.delete(res);
        if (userClients.size === 0) {
            clients.delete(userId);
        }
    });
}

export function isUserOnline(userId: string): boolean {
    const userClients = clients.get(userId);
    return !!userClients && userClients.size > 0;
}

async function nextEventId(userId: string): Promise<number> {
    const cached = eventIdCounter.get(userId);
    if (cached !== undefined) return cached + 1;
    const persisted = await redis.get(`${LAST_EVENT_ID_PREFIX}${userId}`);
    const next = Number(persisted ?? 0) + 1;
    eventIdCounter.set(userId, next);
    return next;
}

// Push to online clients or buffer to the user's offline Redis list for replay later.
export async function notifyUser(userId: string, event: string, data: unknown) {
    const id = await nextEventId(userId);
    eventIdCounter.set(userId, id);
    await redis.set(`${LAST_EVENT_ID_PREFIX}${userId}`, String(id));

    const userClients = clients.get(userId);
    if (userClients && userClients.size > 0) {
        const payload = `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        for (const res of userClients) {
            res.write(payload);
        }
    } else {
        await redis.rpush(`${NOTIFICATION_LIST_PREFIX}${userId}`, JSON.stringify({ id, event, data }));
        await redis.ltrim(`${NOTIFICATION_LIST_PREFIX}${userId}`, -OFFLINE_LIST_MAX, -1);
    }
}

export function sseHandler(req: Request, res: Response) {
    const userId = req.userId;
    if (!userId) {
        res.status(401).json({ success: false, message: "Unauthorized." });
        return;
    }

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.flushHeaders();
    res.write("retry: 3000\n\n");
    addClient(userId, res);

    const heartbeat = setInterval(() => {
        res.write(": ping\n\n");
    }, 15000);
    res.on("close", () => clearInterval(heartbeat));

    const lastEventId = req.headers["last-event-id"] ?? req.query.lastEventId;
    if (lastEventId !== undefined) {
        replayMissed(userId, Number(lastEventId)).catch(error => {
            console.log("\n> [ERROR] (sse.ts) : replay failed :", error.message);
        });
    }
}

async function replayMissed(userId: string, lastEventId: number) {
    const stored = await redis.lrange(`${NOTIFICATION_LIST_PREFIX}${userId}`, 0, -1);
    const userClients = clients.get(userId);
    if (!userClients) return;
    for (const raw of stored) {
        try {
            const parsed = JSON.parse(raw) as { id: number; event: string; data: unknown };
            if (parsed.id > lastEventId) {
                const payload = `id: ${parsed.id}\nevent: ${parsed.event}\ndata: ${JSON.stringify(parsed.data)}\n\n`;
                for (const res of userClients) {
                    res.write(payload);
                }
            }
        } catch (error: any) {
            console.log("\n> [ERROR] (sse.ts) : bad replay entry :", error.message);
        }
    }
}
