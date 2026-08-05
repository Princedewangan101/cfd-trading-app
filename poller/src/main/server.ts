import "dotenv/config";
import { startPoller } from "./poller";
import * as grpc from '@grpc/grpc-js';
import { initGrpc } from "../grpc/server";
import { setupHealthServer } from "./healthServer.js";
import { drainNats } from "../config/nats.js";
import { redis } from "../config/redis.js";
import { prisma } from "../lib/prisma.js";

const grpcServer = new grpc.Server();
startPoller().catch(error => {
    console.log("\n> [ERROR] (server.ts) :", error.message);
});

initGrpc(grpcServer);

setupHealthServer({
    readiness: async () => {
        await redis.ping();
        await prisma.$queryRaw`SELECT 1`;
    },
    onSignal: async () => {
        await drainNats();
        await redis.quit();
        await prisma.$disconnect();
        await new Promise<void>((resolve) => grpcServer.tryShutdown(() => resolve()));
    },
});
