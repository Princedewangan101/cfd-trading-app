import { prisma } from "../lib/prisma";
import * as grpc from '@grpc/grpc-js';

export const grpcService = {
    GetCandles: async (call: any, callback: any) => {
        // console.log("> call (in grpc, GetCandles) :", call);
        try {

            let { symbol, timeFrame } = call.request;

            const candles = await prisma.candle.findMany({
                where: { symbol, timeFrame },
                // select: {  open: true, close: true, high: true, low: true }
                // take: 50,
                // skip: 0
            })

            // console.log("> candles (in grpc, GetCandles) :", candles);

            callback(null, { candles });

        } catch (error: any) {
            console.log("> ERROR (in grpc, GetCandles) :", error.message);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            })
        }
    }
}
