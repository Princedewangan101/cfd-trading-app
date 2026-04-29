import type { BID_ASK_TYPE, ORDER, Side } from "../../type.js";
import producer from "../kafka/producer.js";

//  TODO:   /depth - cummalate qty that are in same price.

const orders = new Map<string, ORDER>();
const buy: BID_ASK_TYPE[] = [];  // decr : 100, 99, 98, 97, 96
const sell: BID_ASK_TYPE[] = [];  // incr : 33, 35, 36, 38

// TODO : ADD A TYPE TO dataToSaveInDb
export async function match(id: string, orderData: ORDER, dataToSaveInDb: any, side: Side, timestamp: number, from: string) {
    try {
        const { orderId, userId, quantity, pair, openPrice } = orderData;

        if (!orderId || !userId || !quantity || !pair || !openPrice || from !== 'engine') { throw new Error("MISSING REQUIRED DATA !!"); }

        orders.set(orderId, orderData)

        if (side === 'BUY') {
            buy.push({ userId, orderId, pair, openPrice, quantity, timestamp })
        } else {
            sell.push({ userId, orderId, pair, openPrice, quantity, timestamp })
        }

        const remainingQuantity = fillorders(userId, pair, openPrice, quantity, side, timestamp);
        if (typeof remainingQuantity === 'string') {
            throw new Error(`ERROR FROM (fillorders fn) : ${remainingQuantity}`);
        }
        if (remainingQuantity === 0) {
            return await producer.send({
                topic: 'order-matching-result',
                messages: [{ value: JSON.stringify({ id, remainingQuantity, dataToSaveInDb, task: 'ADD_INTO_DB', timestamp: Date.now(), from: 'matching-engine' }) }]
            })
        }

        if (side === 'BUY') {
            buy.push({ userId, orderId, pair, openPrice, quantity: remainingQuantity, timestamp })
            // TODO: SORT THE ARRAY , BINARY SEARCH
        } else {
            sell.push({ userId, orderId, pair, openPrice, quantity: remainingQuantity, timestamp })
            // TODO: SORT THE ARRAY , BINARY SEARCH
        }

        // USED IN modify.ts
        redis.set(`cl${orderId}`, dataToSaveInDb.closePrice);

        // // FOR BE TO ADD ORDER IN DB
        await producer.send({
            topic: 'order-matching-result',
            messages: [{ value: JSON.stringify({ id, remainingQuantity, dataToSaveInDb, task: 'ADD_INTO_DB', timestamp: Date.now(), from: 'matching-engine' }) }]
        })

        // // FOR WS TO SHOW CLIENT THE ORDER BOOK IN REALTIME
        await producer.send({
            topic: 'order-book-update',
            messages: [{ value: JSON.stringify({ value: { buy, sell }, event: ORDERBOOK_UPDATE, from: matchingEngine }) }]
        })

    } catch (error: any) {
        console.log('ERROR (match.ts) : ', error.message);
        // FOR BE TO ADD ORDER IN DB
        await producer.send({
            topic: 'order-matching-result',
            messages: [{ value: JSON.stringify({ id, error: `ERROR :  ${error.message}`, task: 'ADD_INTO_DB', timestamp: Date.now(), from: 'matching-engine' }) }]
        })

    }

}

// TODO: wht if this is the start ups new order book
function fillorders(userId: number, pair: string, openPrice: number, quantity: number, side: string, timestamp: number): number | string {

    let remainingQuantity = quantity;

    if (side === "BUY") {
        for (let i = sell.length - 1; i >= 0; i--) {
            const sellObj = sell[i]
            if (!sellObj) { return `MISSING buy[i]` }

            if (sellObj.openPrice > openPrice) { continue; }

            if (sellObj.quantity > remainingQuantity) {
                sellObj.quantity -= remainingQuantity;
                // flipBalance()
            } else {
                remainingQuantity -= sellObj.quantity
                // flipBalance()
            }
            if (remainingQuantity === 0) break;
        }
    } else {
        for (let i = 0; i < buy.length; i++) {
            const buyObj = buy[i]
            if (!buyObj) { return `MISSING sell[i]` }
            if (buyObj.openPrice < openPrice) { continue; }

            if (buyObj.quantity > remainingQuantity) {
                buyObj.quantity -= remainingQuantity;
                // flipBalance()
            } else {
                remainingQuantity -= buyObj.quantity
                // flipBalance()
            }
            if (remainingQuantity === 0) break;
        }
    }

    return remainingQuantity;
}


export async function updateClosingPrice() {
    try {



    } catch (error) {

    }
}