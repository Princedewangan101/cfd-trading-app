import { WebSocket } from 'ws';
import { redis } from '../config/redis.js';
import { prisma } from '../lib/prisma.js';
import { getNats } from '../config/nats.js';
import type { NatsConnection } from 'nats';
import { saveCandle } from './utils.js';

const BACKPACK_URL = process.env.BACKPACK_URL;
if (!BACKPACK_URL) {
    throw new Error("BACKPACK_WS_URL is not defined in .env file");
}

const symbols = ["BTC", "ETH", "SOL"];
const timeFrames = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1month"];

const klineSymbol = timeFrames.flatMap((tf) => symbols.map((sym) => `kline.${tf}.${sym}_USDC`))

let nc: NatsConnection | null = null;
let connecting = false;

async function ensureNats() {
    if (nc || connecting) return;
    connecting = true;
    try {
        nc = await getNats();
    } catch (error: any) {
        console.log("\n> [ERROR] (poller.ts) :", error.message, "- retrying NATS in 1s");
        setTimeout(ensureNats, 1000);
    } finally {
        connecting = false;
    }
}

export const startPoller = async () => {
    ensureNats();

    let ws: WebSocket = new WebSocket(BACKPACK_URL)

    ws.on("open", () => {
        ws.send(
            JSON.stringify({
                method: "SUBSCRIBE",
                params: [...klineSymbol],
                id: 1,
            })
        );
    });

    let lastPrice = "0";

    ws.on("message", async (data: any) => {
        try {
            const parsedData = JSON.parse(data.toString());
            console.log("\n> parsedData :", parsedData);

            const { X: isClose } = parsedData.data

            if (parsedData.data.c) {
                const price = String((Number(parsedData.data.c) * 100).toFixed())
                if (price !== lastPrice) {
                    // "2375633"
                    await redis.set(`LIVE-PRICE-${parsedData.data.s}`, price)
                    if (nc) {
                        await nc.publish(`price.${parsedData.data.s}`, JSON.stringify({ symbol: parsedData.data.s, price: Number(price) }))
                    }
                    lastPrice = price
                    console.log("\n> [DATA] (poller.ts) :", { symbol: parsedData.data.s, price });
                }
            }

            if (isClose === true && parsedData.data.c) {
                const timeFrame = parsedData.stream.split(".")[1]

                // console.log("\n> time :", Math.floor(new Date(parsedData.data.t + "Z" ).getTime() / 1000))
                // console.log("> open :", Number(Number(parsedData.data.o).toFixed(2)))
                // console.log("> close :", Number(Number(parsedData.data.c).toFixed(2)))
                // console.log("> high :", Number(Number(parsedData.data.h).toFixed(2)))
                // console.log("> low :", Number(Number(parsedData.data.l).toFixed(2)))
                // console.log("> volume :", Number(parsedData.data.v))

                await saveCandle(parsedData, String(timeFrame))
            }

        } catch (error: any) {
            console.log("\n> [ERROR] (poller.ts) :", error.message);
        }
    });

    ws.on("close", () => {
        console.log("\n> [INFO] (poller.ts) : closing ws connection with backpack, reconnecting in 1s");
        setTimeout(startPoller, 1000);
    });

    ws.on("error", (error: any) => {
        console.log("\n> [ERROR] (poller.ts) :", error.message);
    });
};

// don't remove it
// parsedData : {
//   data: {
//     E: 1780411795696625,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:50:00',
//     X: false,
//     c: '68146.600000000',
//     h: '68146.600000000',
//     l: '68134.800000000',
//     n: 5,
//     o: '68135.500000000',
//     t: '2026-06-02T14:49:00',
//     v: '0.0074800'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }
