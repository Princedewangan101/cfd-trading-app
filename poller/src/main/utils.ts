import { prisma } from "../lib/prisma";

export async function saveCandle(parsedData: any, timeFrame: string) {
    try {
        const symbolInitial = (parsedData.data.s).split("_")[0];
        const symbol = `${symbolInitial}/USD`;

        let newCandle;

        switch (symbolInitial) {
            case "BTC":
                if (timeFrame === "1m") {
                    newCandle = btc1m(parsedData)
                } else if (timeFrame === "5m") {
                    newCandle = btc5m(parsedData)
                } else {
                    newCandle = btc(parsedData, timeFrame)
                }
                break;

            case "SOL":
                if (timeFrame === "1m") {
                    newCandle = sol1m(parsedData)
                } else if (timeFrame === "5m") {
                    newCandle = sol5m(parsedData)
                } else {
                    newCandle = sol(parsedData, timeFrame)
                }
                break;

            case "ETH":
                if (timeFrame === "1m") {
                    newCandle = eth1m(parsedData)
                } else if (timeFrame === "5m") {
                    newCandle = eth5m(parsedData)
                } else {
                    newCandle = eth(parsedData, timeFrame)
                }
                break;

            default:
                newCandle = candle(symbol, parsedData, timeFrame)
                break;
        }

        return newCandle

    } catch (error: any) {
        return error.message
    }
}

async function candle(symbol: any, parsedData: any, timeFrame: string) {
    const newCandle = await prisma.candle.create({
        data: {
            symbol: String(symbol),
            timeFrame: String(timeFrame),
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (utils.ts in candle fn()) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function btc1m(parsedData: any) {
    const newCandle = await prisma.btc1m.create({
        data: {
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function btc5m(parsedData: any) {
    const newCandle = await prisma.btc5m.create({
        data: {
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function btc(parsedData: any, timeFrame: string) {
    const newCandle = await prisma.btc.create({
        data: {
            timeFrame,
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function sol1m(parsedData: any) {
    const newCandle = await prisma.sol1m.create({
        data: {
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function sol5m(parsedData: any) {
    const newCandle = await prisma.btc5m.create({
        data: {
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function sol(parsedData: any, timeFrame: string) {
    const newCandle = await prisma.btc.create({
        data: {
            timeFrame,
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function eth1m(parsedData: any) {
    const newCandle = await prisma.eth1m.create({
        data: {
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function eth5m(parsedData: any) {
    const newCandle = await prisma.eth5m.create({
        data: {
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

async function eth(parsedData: any, timeFrame: string) {
    const newCandle = await prisma.eth.create({
        data: {
            timeFrame,
            time: Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000), // opentime // UNIX TIMESTAMP in seconds.
            open: Number(Number(parsedData.data.o).toFixed(2)),
            close: Number(Number(parsedData.data.c).toFixed(2)),
            high: Number(Number(parsedData.data.h).toFixed(2)),
            low: Number(Number(parsedData.data.l).toFixed(2)),
            volume: Number(parsedData.data.v)
        }
    })
    if (!newCandle) {
        console.log("\nERROR (poller.ts) :", newCandle);
        throw new Error("Failed to save candle in db.");
    }
    return newCandle
}

export function printTime() {
    const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };

    const indiaTime = new Date().toLocaleTimeString('en-IN', options);
    console.log(`[IST] Current Time: ${indiaTime}`);
}