import { redis } from "./redis.js";

export async function getBalanceFromCache(userId: number) {
    return Number(await redis.get(`${userId}_BALANCE :`))
}


export async function getLivePriceFromCache(userId: number) {
    return 
}


