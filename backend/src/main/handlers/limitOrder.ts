import { type Request, type Response } from 'express';
import { redis } from '../../config/redis.js';
import { prisma } from '../../config/db.js';
import { natsRequest } from '../../config/nats.js';
import { setIdemResponse } from '../util/IdempotencyResponseUpdate.js';
import { OrderStatus } from '../../generated/prisma/client.js';
import { check } from '../util/IdempotencyCheck.js';
import { SUBJECTS } from '../../type/type.js';
import { div, mul, roundUsd } from '../util/money.js';
import Decimal from 'decimal.js';

// 1. IDEMPOTENCY CHECK.
// 2. CHECKED THAT USER HAS ENOUGH BALANCE OR NOT (IF BALANCE IS NOT IN CACHE THEN, WE FETCH FROM DB AND USE IT, CACHE IT).
// 3. ATOMIC TRANSACTION : DECREMENT BALANCE IN USER TABLE, RECORD TRANSACTION, CREATE IKEY RECORD.
// 4. PUSH ORDER INTO REDIS SORTED SET FOR LIMIT ORDER MATCHING

export async function limitOrder(req: Request, res: Response) {
    console.log("\n\n>> /api/limit (api call)");

    const userId = req.userId;

    const { ikey, symbol, price, side, quantity, leverage } = req.body;
    if (!ikey || !symbol || !price || !side || !quantity || !leverage) {
        console.log("\n> ---------- ERROR : missing required fields !");
        return res.status(404).json({ success: false, message: "missing required fields !" })
    }

    try {
        const checkResponse = await check(ikey, userId, "limitOrder");
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

        const orderCost = mul(quantity, div(price, leverage));

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
        console.log(`\n> {p:${price}, oc:${orderCost}, bal:${balance}`);

        if (!balance) {
            console.log("\n> ---------- ERROR : Balance not found.");
            return res.status(404).json({ success: false, message: "Balance not found." })
        }
        const hasBalance = new Decimal(balance).gte(orderCost)

        if (!hasBalance) {
            console.log("\n> ---------- ERROR : Insufficient balance.");
            return res.status(404).json({ success: false, message: "Insufficient balance." })
        }

        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT * FROM "User" WHERE "userId" = ${userId} FOR UPDATE`
            const updateBalanceResult = await tx.user.update({
                where: { userId: userId },
                data: { balance: { decrement: orderCost.toNumber() } }
            })
            const transactionResult = await tx.order.create({
                data: {
                    userId, symbol, side, quantity, leverage, price, openPrice: roundUsd(price).toNumber(), closePrice: null, tp: null, sl: null,
                    status: OrderStatus.PENDING
                }
            })

            return { transactionResult, balance: updateBalanceResult.balance };
        })
        if (!result) {
            await setIdemResponse(ikey, userId, 'failed to create order !')
            return res.status(404).json({ success: false, message: "failed to create order !" })
        }

        await redis.set(`balance:${userId}`, String(result.balance), "EX", 3600);

        console.log("\n> balance :", result.balance);

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
