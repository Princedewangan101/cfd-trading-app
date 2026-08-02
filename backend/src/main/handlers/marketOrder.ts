import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { check } from '../util/IdempotencyCheck.js';
import { OrderStatus } from '../../generated/prisma/client.js';


export async function marketOrder(req: Request, res: Response) {
    console.log("\n\n>> /api/market (api call)");

    const userId = req.userId;

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

        let balance;
        let userBalanceQuery;

        const isBalanceInCache = await redis.exists(`balance:${userId}`)
        console.log("\n> isBalanceInCache :", isBalanceInCache === 0 ? "BAL. 'NOT' IN CACHE" : "BAL. IN CACHE");

        if (isBalanceInCache === 1) {
            balance = await redis.get(`balance:${userId}`)
            console.log("\n> balance (GET-FROM-CACHE) :", balance);
        } else {
            console.log("\n> FETCHING BAL IN DB ...");
            userBalanceQuery = await prisma.user.findUnique({ where: { userId }, select: { balance: true } })
            if (!userBalanceQuery) {
                console.log("\n> ---------- ERROR : Failed to fetch balance.");
                return res.status(404).json({ success: false, message: "Failed to fetch balance." })
            }
            console.log("\n> userBalanceQuery (FETCH FROM DB) :", userBalanceQuery.balance);
            balance = userBalanceQuery.balance
            await redis.set(`balance:${userId}`, String(balance), "EX", 3600);
        }

        console.log(`\n > {lp:${livePrice}, oc:${orderCost}, fee:${fee}, bal:${balance}`);

        if (!balance) {
            console.log("\n> ---------- ERROR : Balance not found.");
            return res.status(404).json({ success: false, message: "Balance not found." })
        }
        const hasBalance = Number(balance) >= Number(orderCostWithFee) ? true : false

        if (!hasBalance) {
            console.log("\n> ---------- ERROR : Insufficient balance.");
            return res.status(404).json({ success: false, message: "Insufficient balance." })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`;
            const updateBalanceResult = await tx.user.update({
                where: { userId: userId },
                data: { balance: { decrement: Number(orderCostWithFee) } }
            })

            const transactionResult = await tx.order.create({
                data: {
                    userId, symbol, side, quantity: Number(quantity), leverage: Number(leverage), openPrice: Number(livePrice), closePrice: null, tp: null, sl: null,
                    status: OrderStatus.RUNNING
                }
            })
            return { transactionResult, balance: updateBalanceResult.balance };
        }, { maxWait: 5000, timeout: 10000 })

        if (!result) {
            await setIdemResponse(ikey, userId, 'Failed to create order.')
            return res.status(404).json({ success: false, message: "Failed to create order." })
        }

        await redis.set(`balance:${userId}`, String(result.balance), "EX", 3600);

        console.log("\n> balance :", result.balance);

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
