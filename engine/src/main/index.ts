import { getNats } from "../config/nats.js";
import { setupRequestHandlers } from "../engine/handlers.js";
import { setupPriceListener } from "../engine/matcher.js";

async function main() {
    const nc = await getNats();
    setupRequestHandlers(nc);
    setupPriceListener(nc);
    console.log("> engine service is running (limit order + TP/SL combined)");
}

main().catch(error => {
    console.log("ERROR (engine main) :", error.message);
    process.exit(1);
});
