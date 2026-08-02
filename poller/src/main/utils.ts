import { prisma } from "../lib/prisma";

export async function saveCandle(parsedData: any, timeFrame: string) {
    try {
        const symbolInitial = (parsedData.data.s).split("_")[0];
        const symbol = `${symbolInitial}/USD`;

        const time = Math.floor(new Date(parsedData.data.t + "Z").getTime() / 1000);

        const newCandle = await prisma.candle.upsert({
            where: {
                symbol_timeFrame_time: { symbol, timeFrame, time }
            },
            update: {
                open: Number(Number(parsedData.data.o).toFixed(2)),
                close: Number(Number(parsedData.data.c).toFixed(2)),
                high: Number(Number(parsedData.data.h).toFixed(2)),
                low: Number(Number(parsedData.data.l).toFixed(2)),
                volume: Number(Number(parsedData.data.v).toFixed(4))
            },
            create: {
                symbol,
                timeFrame,
                time,
                open: Number(Number(parsedData.data.o).toFixed(2)),
                close: Number(Number(parsedData.data.c).toFixed(2)),
                high: Number(Number(parsedData.data.h).toFixed(2)),
                low: Number(Number(parsedData.data.l).toFixed(2)),
                volume: Number(Number(parsedData.data.v).toFixed(4))
            }
        })

        return newCandle

    } catch (error: any) {
        console.log("\n> [ERROR] (utils.ts) :", error.message);
        return error.message
    }
}
