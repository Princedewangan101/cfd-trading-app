import { type Request, type Response } from 'express';
import { getCandles } from '../../grpc/getCandles.js';
import { redis } from '../../config/redis.js';

export async function candles(req: Request, res: Response) {
    console.log("\n\n>> /api/candles (api call)");
    let { symbol: symbolInUnderScore, timeFrame } = req.params
    symbolInUnderScore = String(symbolInUnderScore);
    timeFrame = String(timeFrame);
    const from = req.query.from ? Number(req.query.from) : undefined;
    const take = req.query.take ? Number(req.query.take) : undefined;

    if (!symbolInUnderScore || !timeFrame) {
        return res.status(400).json({ success: false, message: "Missing required field !" })
    }

    const symbol = `${symbolInUnderScore.split("_")[0]}/USD`

    const cacheKey = `symbol:${symbol},timeFrame:${timeFrame},from:${from ?? "null"}`

    try {
        if (!from) {
            const cachedCandles = await redis.get(cacheKey)
            if (cachedCandles) {
                const parseCandles = JSON.parse(cachedCandles);
                console.log("\n> candles (FROM CACHE) :", parseCandles.length);
                return res.status(200).json({ success: true, candles: parseCandles })
            }
        }

        console.log("> MAKING GRPC CALL ... ");
        const grpcResponse = await getCandles(symbol, timeFrame, from, take)
        const candleData = grpcResponse.candles ?? []
        console.log("\n> grpcResponse.candles count :", candleData.length);

        if (!from) {
            await redis.set(cacheKey, JSON.stringify(candleData), "EX", 60);
        }

        return res.status(200).json({ success: true, candles: candleData })
    } catch (error: any) {
        console.log("> ERROR (/api/candles) :", error.message);
        return res.status(500).json({ success: false, message: "Server error !" })
    }
}
