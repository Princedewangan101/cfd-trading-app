import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import pinoHttp from "pino-http";
import router from "./routes/routes.js";
import { corsOptions } from "../config/corsConfig.js";
import cookieParser from "cookie-parser";
import { setupEventHandler } from "./queueHandler/handler.js";
import { createTerminus, HealthCheckError } from "@godaddy/terminus";
import { drainNats, getNats } from "../config/nats.js";
import { redis } from "../config/redis.js";
import { prisma } from "../config/db.js";
import { logger } from "./util/logger.js";

const app = express();

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Structured per-request logging with a traceable X-Request-Id.
app.use(pinoHttp({
    logger,
    genReqId: (req, res) => {
        const id = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
    },
    autoLogging: {
        ignore: (req) =>
            req.url?.includes("/healthz") ||
            req.url?.includes("/readyz") ||
            req.url?.includes("/api/events"),
    },
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
    customProps: (req) => ({ userId: req.userId ?? undefined }),
}));

setupEventHandler();

app.use('/api', router);

const port = 5000;
const server = app.listen(port, () => {
    console.log(`server running at ${port}`);
});

async function readiness() {
    const results = await Promise.allSettled([
        (async () => {
            const nc = await getNats();
            if (nc.isClosed()) throw new Error("NATS is closed");
        })(),
        redis.ping(),
        prisma.$queryRaw`SELECT 1`,
    ]);
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
        throw new HealthCheckError("readiness check failed", failures);
    }
}

async function onSignal() {
    await drainNats();
    await redis.quit();
    await prisma.$disconnect();
}

createTerminus(server, {
    healthChecks: {
        "/healthz": () => Promise.resolve(),
        "/readyz": readiness,
    },
    timeout: 10000,
    signals: ["SIGTERM", "SIGINT"],
    onSignal,
});
