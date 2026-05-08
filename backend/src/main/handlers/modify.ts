import { type Request, type Response } from 'express';
import { prisma } from '../../config/db.js';

export async function modify(req: Request, res: Response) {
    const userId = "101"
    const { orderId, tp, sl } = req.body;

    if (!orderId || !tp || !sl || userId) { res.status(404).json({ success: false, message: "missing required fields !" }) }

    const result = await prisma.order.update({
        where: { orderId, userId },
        data: { tp, sl },
        select: { orderId: true, tp: true, sl: true }
    })
    if (!result) {
        res.status(404).json({ success: false, message: "failed to modify order !" })
    }

    res.status(200).json({ success: true, data: { orderId: result.orderId, tp: result.tp, sl: result.sl } })
}