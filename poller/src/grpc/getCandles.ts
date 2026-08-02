import { prisma } from "../lib/prisma";
import * as grpc from '@grpc/grpc-js';

export const grpcService = {
    GetCandles: async (call: any, callback: any) => {
        try {
            let { symbol, timeFrame, from, take } = call.request;

            const fromNum = from ? Number(from) : undefined;
            const takeNum = take ? Number(take) : undefined;

            const candles = await prisma.candle.findMany({
                where: {
                    symbol,
                    timeFrame,
                    ...(fromNum ? { time: { lt: fromNum } } : {})
                },
                orderBy: { time: 'desc' },
                ...(takeNum ? { take: takeNum } : {})
            })

            const orderedCandles = candles.reverse();

            callback(null, { candles: orderedCandles });

        } catch (error: any) {
            console.log("> ERROR (in grpc, GetCandles) :", error.message);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            })
        }
    }
}
