import "dotenv/config";
import { getNats } from "../config/nats.js";
import { setupRequestHandlers } from "../engine/handlers.js";
import { setupPriceListener } from "../engine/matcher.js";
import { rehydrateOrderBook } from "../boot/rehydrate.js";
import { ensureOrdersStream } from "../boot/setupJetStream.js";

async function main() {
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
