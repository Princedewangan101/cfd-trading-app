import { redis } from "../config/redis.js";

export async function dataPush() {
    for (let i = 0; i < 1; i++) {
        // {tp:23303, sl:23303, symbol:"SOLUSD",side:"BUY"/"SELL", orderId:"orderId", userId:"userId"}
        await redis.lpush("sltpOrderClose", JSON.stringify({ tp: 23303, sl: 23303, symbol: "SOLUSD", side: `${i % 2 === 0 ? "BUY" : "SELL"}`, orderId: `${i}`, userId: "userId" }))
        console.log("pushed", i);
    }
    return
}

export async function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(() => { resolve }, ms)
    })
}

export async function pushLimitOrders() {
     await redis.lpush("limitOrders", JSON.stringify({orderId:"1", userId:"1", symbol:"BTCUSD", side:"BUY", price:"2344599"}));
}

export function printTime() {
    const options = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
    };

    const indiaTime = new Date().toLocaleTimeString('en-IN', options);
    console.log(`[IST] Current Time: ${indiaTime}`);
}