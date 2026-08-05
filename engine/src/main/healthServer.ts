import { createServer } from "node:http";
import { createTerminus } from "@godaddy/terminus";

const PORT = Number(process.env.HEALTH_PORT ?? 8081);

// Minimal node:http health server (engine has no public HTTP API) wired to
// @godaddy/terminus so SIGTERM/SIGINT trigger the provided onSignal drain.
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
