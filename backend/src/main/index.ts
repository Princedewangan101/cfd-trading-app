import "dotenv/config";
import express from "express";
import cors from "cors";
import router from "./routes/routes.js";
import { corsOptions } from "../config/corsConfig.js";
import cookieParser from "cookie-parser";
import { setupEventHandler } from "./queueHandler/handler.js";
import { createTerminus, HealthCheckError } from "@godaddy/terminus";
import { drainNats, getNats } from "../config/nats.js";
import { redis } from "../config/redis.js";
import { prisma } from "../config/db.js";

const app = express();

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
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
