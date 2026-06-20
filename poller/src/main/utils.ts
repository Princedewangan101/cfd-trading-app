import { prisma } from "../lib/prisma";

export async function candleQuery(parsedData: any, timeFrame: string) {
    try {
        const symbolSplit = (parsedData.data.s).split("_");
        const symbol = `${symbolSplit[0]}/USD`;

        const newCandle = await prisma.candle.create({
            data: {
                symbol,
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

    } catch (error: any) {
        return error.message
    }
}