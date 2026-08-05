import { createServer } from "node:http";
import { createTerminus } from "@godaddy/terminus";

const PORT = Number(process.env.HEALTH_PORT ?? 8082);

// Minimal node:http health server for the poller (gRPC runs on 50051, no HTTP
// API), wired to @godaddy/terminus for graceful SIGTERM/SIGINT shutdown.
export function setupHealthServer(options: {
    onSignal: () => Promise<void>;
    readiness?: () => Promise<void>;
}): void {
    const server = createServer((_req, res) => {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
    });

    createTerminus(server, {
        healthChecks: {
            "/healthz": () => Promise.resolve(),
            "/readyz": options.readiness ?? (() => Promise.resolve()),
        },
        timeout: 10000,
        signals: ["SIGTERM", "SIGINT"],
        onSignal: options.onSignal,
    });

    server.listen(PORT, () => {
        console.log(`\n> [INFO] (healthServer.ts) : health server listening on ${PORT}`);
    });
}
