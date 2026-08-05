import "dotenv/config";
import { getNats, drainNats } from "../config/nats.js";
import { setupRequestHandlers } from "../engine/handlers.js";
import { setupPriceListener } from "../engine/matcher.js";
import { rehydrateOrderBook } from "../boot/rehydrate.js";
import { ensureOrdersStream } from "../boot/setupJetStream.js";
import { setupHealthServer } from "./healthServer.js";

async function main() {
    setupHealthServer({
        readiness: async () => {
            const nc = await getNats();
            if (nc.isClosed()) throw new Error("NATS is closed");
        },
        onSignal: () => drainNats(),
    });

    await rehydrateOrderBook();
    const nc = await getNats();
    await ensureOrdersStream(nc);
    setupRequestHandlers(nc);
    setupPriceListener(nc);
    console.log("\n> engine service is running (limit order + TP/SL combined)");
}

main().catch(error => {
    console.log("\n> [ERROR] (engine main) :", error.message);
    process.exit(1);
});
