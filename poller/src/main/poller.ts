import { WebSocket } from 'ws';
import { redis } from '../config/redis.js';

if (!process.env.BACKPACK_URL) {
    throw new Error("BACKPACK_WS_URL is not defined in .env file");
}

let ws: WebSocket = new WebSocket(process.env.BACKPACK_URL)

// let latestData: Record<string, {}> = {};

const tickerSymbol = ["ticker.ETH_USDC", "ticker.BTC_USDC", "ticker.SOL_USDC"]
const klineSymbol = ["kline.1m.ETH_USDC", "kline.1m.BTC_USDC", "kline.1m.SOL_USDC"]

export const startPoller = async () => {
    ws.on("open", () => {
        ws.send(
            JSON.stringify({
                method: "SUBSCRIBE",
                params: [...klineSymbol, ...tickerSymbol],
                id: 1,
            })
        );
    });

    ws.on("message", async (data: any) => {
        const parsedData = JSON.parse(data.toString());
        console.log("parsedData :", parsedData);

        const startswithticker = parsedData.stream.startwith("ticker")

        switch (startswithticker) {
            case true:
                const price = (Number(parsedData.data.lastPrice)).toFixed(2)
                await redis.set(`LIVE-PRICE-${parsedData.data.symbol}`, price)
                await redis.lpush("liveprice", JSON.stringify({ symbol: parsedData.data.symbol, price: price }))
                break;

            case false:
                // save chart data into db !
                // await prisma.candle.create({
                //     data: {

                //     }
                // })
                break;

            default:
                break;
        }


    });

    ws.on("close", () => {
        console.log("closing ws connection with backpack");
        setTimeout(startPoller, 1000);
    });
};

// import { Kafka } from "kafkajs";

// const kafka = new Kafka({
//     clientId: "exness-app-1",
//     brokers: ["localhost:9092"],
// });
// const producer = kafka.producer();
// await producer.connect();


//          params: ["kline.1m.ETH_USDC"],
//     parsedData : {
//   data: {
//     E: 1778075355073985,
//     e: 'kline',
//     s: 'ETH_USDC',
//     T: '2026-05-06T13:50:00',
//     X: false,
//     c: '2371.770000000',
//     h: '2371.770000000',
//     l: '2370.610000000',
//     n: 5,
//     o: '2370.610000000',
//     t: '2026-05-06T13:49:00',
//     v: '0.2650000'
//   },
//   stream: 'kline.1m.ETH_USDC'
// }
