import { type Request, type Response } from 'express';
import { prisma } from '../../config/db.js';
import { redis } from '../../config/redis.js';

export async function modify(req: Request, res: Response) {
    const userId = req.userId;
    const { orderId, tp, sl } = req.body;

    if (!orderId || !userId) { return res.status(404).json({ success: false, message: "Missing required fields !" }) }
    if (!tp && !sl) { return res.status(404).json({ success: false, message: "Missing required fields !" }) }

    const validatingTpSlFromOpenPrive = await prisma.order.findUnique({
        where: { orderId },
        select: { openPrice: true, side: true, symbol: true }
    })
    if (!validatingTpSlFromOpenPrive) {
        return res.status(404).json({ success: false, message: "Open price for validtion not found." })
    }
    const { openPrice, side, symbol } = validatingTpSlFromOpenPrive;

    if (!openPrice || !side || !symbol) {
        return res.status(404).json({ success: false, message: "Not found destructure price, side , symbol" })
    }

    const livePrice = await redis.get(`LIVE-PRICE-${symbol}`);
    if (!livePrice) { return res.status(404).json({ success: false, messge: "Live price not found." }) }

    switch (side) {
        case "BUY":
            if (tp) {
                if (Number(tp) < Number(openPrice)) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
                if (Number(tp) <= Number(livePrice)) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
            }
            if (sl) {
                if (Number(sl) > Number(livePrice)) { return res.status(400).json({ success: false, messge: "Invalid stop loss" }) }
            }
            break;

        case "SELL":
            if (tp) {
                if (Number(tp) > Number(openPrice)) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
                if (Number(tp) >= Number(livePrice)) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
            }
            if (sl) {
                if (Number(sl) < Number(livePrice)) { return res.status(400).json({ success: false, messge: "Invalid stop loss" }) }
            }
            break;
    }

    await redis.lpush("sltpOrderClose", JSON.stringify({ orderId, userId, side, symbol,tp,sl }));

    const result = await prisma.order.update({
        where: { orderId, userId },
        data: { tp, sl },
        select: { orderId: true, tp: true, sl: true }
    })
    if (!result) {
        return res.status(404).json({ success: false, message: "failed to modify order !" })
    }

    return res.status(200).json({ success: true, data: { orderId: result.orderId, tp: result.tp, sl: result.sl } })
}