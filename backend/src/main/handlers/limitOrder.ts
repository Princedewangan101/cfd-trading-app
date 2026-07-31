import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { OrderStatus } from '../../generated/prisma/client.js';
import { check } from '../util/IdempotencyCheck.js';
import { SUBJECTS } from '../../type/type.js';

// 1. IDEMPOTENCY CHECK.
// 2. CHECKED THAT USER HAS ENOUGH AVAILABLE BALANCE OR NOT (IF AVAILABLE BALANCE IS NOT IN CACHE THEN, WE FETCH FROM DB AND USE IT, CACHE IT).
// 3. ATOMIC TRANSACTION : DECREMENT AVAILABLE BALANCE, INCREMENT LOCK BALANCE IN USER TABLE, RECORD TRANSACTION, CREATE IKEY RECORD.
// 4. PUSH ORDER INTO REDIS SORTED SET FOR LIMIT ORDER MATCHING

export async function limitOrder(req: Request, res: Response) {
    console.log("\n\n>> /api/limit (api call)");

    // const userId = req.userId;
    const userId = "72c62fec-64a7-4b7f-89b4-e0e0ad2c2a25";

    const { ikey, symbol, price, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !price || !side || !quantity || !leverage) {
        console.log("\n> ---------- ERROR : missing required fields !");
        return res.status(404).json({ success: false, message: "missing required fields !" })
    }

    try {
        const checkResponse = check(res, ikey, userId, "limitOrder");
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

        const orderCost = Number(quantity) * (Number(price) / Number(leverage));

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
        console.log(`\n> {p:${price}, oc:${orderCost}, avb:${availableBalance}`);

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
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`
            const updateBalanceResult = await tx.user.update({
                where: { userId: userId },
                data: { availableBalance: { decrement: Number(orderCost) }, lockedBalance: { increment: Number(orderCost) } }
            })
            const transactionResult = await tx.order.create({
                data: {
                    userId, symbol, side, quantity, leverage, openPrice: price, closePrice: null, tp: null, sl: null,
                    status: OrderStatus.PENDING
                }
            })

            return { transactionResult, availableBalance: updateBalanceResult.availableBalance, lockedBalance: updateBalanceResult.lockedBalance };
        })
        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to create order !')
            return res.status(404).json({ success: false, message: "failed to create order !" })
        }

        const totalBalance = String(Number(result.availableBalance) + Number(result.lockedBalance))
        await redis.set(`totalBalance:${userId}`, `${totalBalance}`, "EX", 3600);
        await redis.set(`availableBalance:${userId}`, String(result.availableBalance), "EX", 3600);
        await redis.set(`lockedBalance:${userId}`, String(result.lockedBalance), "EX", 3600);

        console.log("\n> total bal :", totalBalance);
        console.log("\n> ava bal :", result.availableBalance);
        console.log("\n> lock bal :", result.lockedBalance);

        const { orderId, openPrice, status, createdAt } = result.transactionResult;

        // PUSHING ORDER INTO ENGINE VIA NATS FOR : LIMIT-ORDER-MATCHING ()
        await natsRequest(SUBJECTS.LIMIT_ORDER_SUBMIT, { orderId, userId, symbol, side, price, quantity, leverage });

        // IDEM RESPONSE SET
        await redis.set(`limitOrder${ikey}`, JSON.stringify({ orderId, price: openPrice, createdAt }))

        // IDEM RESPONSE SET (DATABASE)
        await setIdemResponse(ikey, userId, JSON.stringify({ orderId, price: openPrice, createdAt }))
        console.log("---------------complete");
        return res.status(201).json({ success: true, data: { orderId, price: openPrice, status, createdAt } })


    } catch (error: any) {
        console.log("limitOrder ERROR : ", error.message);
        await setIdemResponse(ikey, userId, `${error.message}`)
        console.log("---------------error");
        return res.status(500).json({ success: false, message: "server error !" })
    }
}