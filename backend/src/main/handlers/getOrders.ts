import { type Request, type Response } from 'express';
import { prisma } from '../../config/db.js';

export async function getOrders(req: Request, res: Response) {
    console.log("\n\n>> /api/orders (api call)");

    const userId = req.userId;

    try {
        const orders = await prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        console.log("\n> orders count :", orders.length);

        return res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
        console.log("\n> [ERROR] (getOrders.ts) :", error.message);
        return res.status(500).json({ success: false, message: "server error !" });
    }
}
