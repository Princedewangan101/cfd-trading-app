import { response, type Request, type Response } from 'express';
import { getCandles } from '../grpc/getCandles';
import { redis } from '../../config/redis';

export async function candles(req: Request, res: Response) {
    // console.log("\n\n>> /api/candles");
    const { symbol, timeFrame } = req.params

    if (!symbol || !timeFrame) {
        return res.status(404).json({ success: false, message: "Missing required field !" })
    }

    try {
        const candles = await redis.get(`symbol:${symbol},timeFrame:${timeFrame}`)
        // console.log("> candles (redis) :", candles);

        if (candles) {
            const parseCandles = JSON.parse(candles);
            return res.status(500).json({ success: false, response: parseCandles })
        } else {
            // console.log("> MAKING GRPC CALL ... ");

            const grpcResponse = await getCandles(symbol, timeFrame)
            console.log("> grpcResponse :", grpcResponse);

            // await redis.set(`symbol:${symbol},timeFrame:${timeFrame}`, grpcResponse, "EX", 3600)

            // return res.status(500).json({ success: false,  })
        }
    } catch (error: any) {
        console.log("> ERROR (/api/candles) :", error.message);
        return res.status(500).json({ success: false, message: "Server error !" })
    }
}