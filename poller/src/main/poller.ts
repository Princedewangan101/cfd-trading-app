import { WebSocket } from 'ws';
import { redis } from '../config/redis.js';
import { prisma } from '../lib/prisma.js';

if (!process.env.BACKPACK_URL) {
    throw new Error("BACKPACK_WS_URL is not defined in .env file");
}

let ws: WebSocket = new WebSocket(process.env.BACKPACK_URL)


// const tickerSymbol = ["ticker.ETH_USDC", "ticker.BTC_USDC", "ticker.SOL_USDC"]
// const klineSymbol = ["kline.1m.ETH_USDC", "kline.1m.BTC_USDC", "kline.1m.SOL_USDC"]
const tickerSymbol = ["ticker.BTC_USDC"]
const klineSymbol = ["kline.1m.BTC_USDC"]

export const startPoller = async () => {
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
            // console.log("\nparsedData :", parsedData);
            const { X: isClose } = parsedData.data
            // console.log("isClose :", isClose);



            if (parsedData.data.c) {
                const price = String(Math.round(Number(parsedData.data.c) * 100))
                if (price !== lastPrice) {   
                    // "2375633"
                    await redis.set(`LIVE-PRICE-${parsedData.data.s}`, price)
                    // await redis.lpush("liveprice", JSON.stringify({ symbol: parsedData.data.s, price: price }))
                    lastPrice = price
                    // console.log("PRICE :", price);
                }
            }


            if (isClose === true && parsedData.data.c) {
                // console.log("\nparsedData :", parsedData);
                const newCandle = await prisma.candle.create({
                    data: {
                        eventType: parsedData.data.e,
                        eventTime: parsedData.data.E,
                        symbol: parsedData.data.s,
                        openTime: parsedData.data.t,
                        closeTime: parsedData.data.T,
                        openPrice: parsedData.data.o,
                        closePrice: parsedData.data.c,
                        highPrice: parsedData.data.h,
                        lowPrice: parsedData.data.l,
                        volume: parsedData.data.v,
                        isClose,
                        noOfTrade: parsedData.data.n
                    }
                })
                if (!newCandle) {
                    console.log("\nERROR (poller.ts) :", newCandle);
                    throw new Error("Failed to save candle in db.");
                }
                // console.log("\nnewCandle :", newCandle);
            }

        } catch (error: any) {
            console.log("\nERROR (poller.ts) :", error.message);
        }
    });

    ws.on("close", () => {
        console.log("closing ws connection with backpack");
        setTimeout(startPoller, 1000);
    });
};

// false ohlc
// true ohlc
// true null

// ------------------------------------------------------------------------------------------------------

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

// parsedData : {
//   data: {
//     E: 1780411797699314,
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

// parsedData : {
//   data: {
//     E: 1780411801658281,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:50:00',
//     X: true,
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

// parsedData : {
//   data: {
//     E: 1780411801658317,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:50:00',
//     X: true,
//     c: null,
//     h: null,
//     l: null,
//     n: 0,
//     o: null,
//     t: '2026-06-02T14:49:00',
//     v: null
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411801658359,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:50:00',
//     X: true,
//     c: null,
//     h: null,
//     l: null,
//     n: 0,
//     o: null,
//     t: '2026-06-02T14:49:00',
//     v: null
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411807684734,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411809686866,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411811690179,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411813797805,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411815687973,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411817695071,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411819692901,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411821705885,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411823697500,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411825778712,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411827696331,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411829822994,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411831687855,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411833751002,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68154.100000000',
//     h: '68157.300000000',
//     l: '68154.100000000',
//     n: 3,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0036200'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411835695130,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 4,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0044300'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411837687042,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 4,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0044300'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411839685361,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411841687958,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411843689968,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411845685259,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411847859647,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411849844721,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411851763571,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411853691952,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411855722200,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411857740965,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411859696299,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: false,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411861778784,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: true,
//     c: '68117.100000000',
//     h: '68157.300000000',
//     l: '68117.100000000',
//     n: 6,
//     o: '68157.300000000',
//     t: '2026-06-02T14:50:00',
//     v: '0.0072400'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411861778809,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: true,
//     c: null,
//     h: null,
//     l: null,
//     n: 0,
//     o: null,
//     t: '2026-06-02T14:50:00',
//     v: null
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411861778812,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: true,
//     c: null,
//     h: null,
//     l: null,
//     n: 0,
//     o: null,
//     t: '2026-06-02T14:50:00',
//     v: null
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411861778823,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: true,
//     c: null,
//     h: null,
//     l: null,
//     n: 0,
//     o: null,
//     t: '2026-06-02T14:50:00',
//     v: null
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411861778827,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: true,
//     c: null,
//     h: null,
//     l: null,
//     n: 0,
//     o: null,
//     t: '2026-06-02T14:50:00',
//     v: null
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411861778840,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:51:00',
//     X: true,
//     c: null,
//     h: null,
//     l: null,
//     n: 0,
//     o: null,
//     t: '2026-06-02T14:50:00',
//     v: null
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411871684112,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411873685581,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411875687484,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411877683068,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411879687521,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411881688045,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411883695196,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411885951356,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411887682989,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411889705820,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411891688934,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411893684805,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411895691284,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411897686894,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411899743945,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68141.400000000',
//     h: '68141.400000000',
//     l: '68107.100000000',
//     n: 6,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0111900'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }

// parsedData : {
//   data: {
//     E: 1780411901697527,
//     e: 'kline',
//     s: 'BTC_USDC',
//     T: '2026-06-02T14:52:00',
//     X: false,
//     c: '68164.400000000',
//     h: '68165.400000000',
//     l: '68107.100000000',
//     n: 10,
//     o: '68107.100000000',
//     t: '2026-06-02T14:51:00',
//     v: '0.0187000'
//   },
//   stream: 'kline.1m.BTC_USDC'
// }
