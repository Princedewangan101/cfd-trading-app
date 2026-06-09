import { prisma } from "../lib/prisma";
import * as grpc from '@grpc/grpc-js';

export const grpcService =  {
    GetCandles: async (call: any, callback: any) => {
        // console.log("> call (in grpc, GetCandles) :", call);
        try {

            const { symbol, timeFrame } = call.request;

            const candles = await prisma.candle.findMany({
                // where: { symbol, timeFrame }
                where: { symbol }
            })

            console.log("> candles (in grpc, GetCandles) :", candles);

            callback(null, {candles});

        } catch (error: any) {
            console.log("> ERROR (in grpc, GetCandles) :", error.message);
            callback({
                code: grpc.status.INTERNAL,
                message: error.message
            })
        }
    }
}
