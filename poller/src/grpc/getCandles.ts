import { prisma } from "../lib/prisma";
import * as grpc from '@grpc/grpc-js';

export const grpcService = {
    GetCandles: async (call: any, callback: any) => {
        try {
            let { symbol, timeFrame, from, take } = call.request;

            const candles = await prisma.candle.findMany({
                where: {
                    symbol,
                    timeFrame,
                    ...(from ? { time: { lt: Number(from) } } : {})
                },
                orderBy: { time: 'desc' },
                ...(take ? { take: Number(take) } : {})
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
