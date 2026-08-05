import { type Request, type Response } from 'express';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { getLivePrice } from '../util/livePrice.js';
import { SUBJECTS } from '@cfd/contracts';

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

    const livePrice = await getLivePrice(symbol);
    if (livePrice === null) { return res.status(404).json({ success: false, messge: "Live price not found." }) }

    switch (side) {
        case "BUY":
            if (tp) {
                if (Number(tp) < Number(openPrice)) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
                if (Number(tp) <= livePrice) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
            }
            if (sl) {
                if (Number(sl) > livePrice) { return res.status(400).json({ success: false, messge: "Invalid stop loss" }) }
            }
            break;

        case "SELL":
            if (tp) {
                if (Number(tp) > Number(openPrice)) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
                if (Number(tp) >= livePrice) { return res.status(400).json({ success: false, messge: "Invalid take profit" }) }
            }
            if (sl) {
                if (Number(sl) < livePrice) { return res.status(400).json({ success: false, messge: "Invalid stop loss" }) }
            }
            break;
    }

    await natsRequest(SUBJECTS.ORDER_TP_SL, { orderId, userId, symbol, side, tp, sl, openPrice });

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