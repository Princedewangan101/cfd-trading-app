import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { check } from '../util/IdempotencyCheck.js';
import { OrderStatus } from '../../generated/prisma/client.js';


export async function marketOrder(req: Request, res: Response) {
    console.log("\n\n>> /api/market (api call)");

    // const userId = req.userId;
    const userId = "72c62fec-64a7-4b7f-89b4-e0e0ad2c2a25";

    const { ikey, symbol, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !side || !quantity || !leverage) {
        console.log("\n> ---------- ERROR : missing required fields !");
        return res.status(404).json({ success: false, message: "missing required fields !" })
    }


    try {
        const checkResponse = await check(res, ikey, userId, "marketOrder");
        if (!checkResponse) {
            return res.status(400).json({ success: false, message: "Failed in idempotency check." })
        } else {
            switch (checkResponse.responseType) {
                case "firstRequest":
                    console.log("\n> 'firstRequest' ");
                    break;

                case "alreadyHaveResponse":
                    console.log("\n> 'alreadyHaveResponse'\n> ", { success: true, response: checkResponse.response });
                    return res.status(200).json({ success: true, response: checkResponse.response });

                case "duplicateRequest":
                    console.log("\n> 'duplicateRequest'\n> ", { success: false, message: "Duplicate request." });
                    return res.status(400).json({ success: false, message: "Duplicate request." });

                default:
                    break;
            }
        }

        const livePrice = await redis.get(`LIVE-PRICE-${symbol}`) || "67888.33";
        if (!livePrice) {
            return res.status(404).json({ success: false, message: "Live price not found." })
        }

        const orderCost = Number(quantity) * (Number(livePrice) / Number(leverage));
        const fee = 0.20 // dollar per quantity
        const orderCostWithFee = orderCost + (Number(quantity) * Number(fee))

        let availableBalance;
        let userAvailableBalanceQuery;

        const isAvailableBalanceInCache = await redis.exists(`availableBalance:${userId}`)
        console.log("\n> isAvailableBalanceInCache :", isAvailableBalanceInCache === 0 ? "AVA. BAL. 'NOT' IN CACHE" : "AVA. BAL. IN CACHE");

        if (isAvailableBalanceInCache === 1) {
            availableBalance = await redis.get(`availableBalance:${userId}`)
            console.log("\n> availableBalance (GET-FROM-CACHE) :", availableBalance);
        } else {
            console.log("\n> FETCHING BAL IN DB ...");
            userAvailableBalanceQuery = await prisma.user.findUnique({ where: { userId }, select: { availableBalance: true } })
            if (!userAvailableBalanceQuery) {
                console.log("\n> ---------- ERROR : Failed to fetch balance.");
                return res.status(404).json({ success: false, message: "Failed to fetch balance." })
            }
            console.log("\n> userAvailableBlnceQuery (FETCH FROM DB) :", userAvailableBalanceQuery.availableBalance);
            availableBalance = userAvailableBalanceQuery.availableBalance
            await redis.set(`availableBalance:${userId}`, String(availableBalance), "EX", 3600);
        }

        console.log(`\n > {lp:${livePrice}, oc:${orderCost}, fee:${fee}, avb:${availableBalance}`);

        if (!availableBalance) {
            console.log("\n> ---------- ERROR : Available balance not found.");
            return res.status(404).json({ success: false, message: "Available balance not found." })
        }
        const hasBalance = Number(availableBalance) >= Number(orderCost) ? true : false

        if (!hasBalance) {
            console.log("\n> ---------- ERROR : Insufficient balance.");
            return res.status(404).json({ success: false, message: "Insufficient balance." })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { decrement: Number(orderCostWithFee) }, lockedBalance: { increment: Number(orderCost) } }
            })

            const transactionResult = await tx.order.create({
                data: {
                    userId, symbol, side, quantity: Number(quantity), leverage: Number(leverage), openPrice: livePrice, closePrice: null, tp: null, sl: null,
                    status: OrderStatus.EXECUTED
                }
            })
            return { transactionResult, availableBalance: updateBalanceResult.availableBalance, lockedBalance: updateBalanceResult.lockedBalance };
        }, { maxWait: 5000, timeout: 10000 })

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to create order.')
            return res.status(404).json({ success: false, message: "Failed to create order." })
        }

        const totalBalance = String(Number(result.availableBalance) + Number(result.lockedBalance))
        await redis.set(`totalBalance:${userId}`, `${totalBalance}`, "EX", 3600);
        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);
        await redis.set(`lockedBalance:${userId}`, String(result.lockedBalance), "EX", 3600);

        console.log("\n> total bal :", totalBalance);
        console.log("\n> ava bal :", result.availableBalance);
        console.log("\n> lock bal :", result.lockedBalance);

        const { orderId, openPrice, status, createdAt } = result.transactionResult;

        await setIdemResponse(ikey, userId, JSON.stringify({ orderId, price: openPrice, createdAt }))
        console.log("--------------- complete");
        return res.status(200).json({ success: true, data: { orderId, price: openPrice, status, createdAt } })

    } catch (error: any) {
        console.log("ERROR (marketOrder) : ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`)
        console.log("--------------- error");
        return res.status(500).json({ success: false, message: `Server error !` })
    }
} 