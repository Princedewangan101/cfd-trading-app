import { sub } from "../redis";
import { userConnections } from "./userConnRecord";

const CHANNEL = 'TRADE_UPDATES';

sub.subscribe(CHANNEL, (err) => {
    if (err) console.error("!!! FAILED TO SUBSCRIBE CHANNEL IN REDIS : ", err.message);
    else console.log("CONGRATS SUCCESS ACHIEVED IN SUBSCRIBING THE CHANNEL :", CHANNEL);
})


export async function tradeExecuted() {
    sub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
            const data = JSON.parse(message);

            const clientSocket = userConnections.get(data.userId)

            // 1 = OPEN
            if (clientSocket && clientSocket.readyState === 1) {
                clientSocket.send(JSON.stringify({
                    userId: data.userId,
                    data: data.value,
                    event: data.event,
                    from: data.from
                }));
                console.log(`SUCCESSFULLY SENT TRADE EXEC MSG`);
            }
        }
    })
}

export async function tradeFailed() {
    sub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
            const data = JSON.parse(message);

            const clientSocket = userConnections.get(data.userId_of_failed_trade)

            // 1 = OPEN
            if (clientSocket && clientSocket.readyState === 1) {
                clientSocket.send(JSON.stringify({
                    userId: data.userId_of_failed_trade,
                    errorMessage: data.errorMessage,
                    event: data.event,
                    from: data.from
                }));
                console.log(`SUCCESSFULLY SENT FAILED TRADE MSG`);
            }
        }
    })
}

export async function priceUpdate() {
    sub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
            const data = JSON.parse(message);

            userConnections.forEach(ws => {
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        livePrice: data.livePrice,
                        event: data.event,
                        from: data.from
                    }));
                    console.log(`SUCCESSFULLY SENT UPDATED PRICE`);
                }
            });

        }
    })
}

export async function balanceUpdate() {
    sub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
            const data = JSON.parse(message);

            const clientSocket = userConnections.get(data.userId_for_balance)

            // 1 = OPEN
            if (clientSocket && clientSocket.readyState === 1) {
                clientSocket.send(JSON.stringify({
                    userId: data.userId_for_balance,
                    value: data.value,
                    event: data.event,
                    from: data.from
                }));
                console.log(`SUCCESSFULLY SENT FAILED TRADE MSG`);
            }

        }
    })
}

export async function closingPriceUpdate() {
    sub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
            const data = JSON.parse(message);

            const clientSocket = userConnections.get(data.userId_to_notify_cl_update)

            // 1 = OPEN
            if (clientSocket && clientSocket.readyState === 1) {
                clientSocket.send(JSON.stringify({
                    userId: data.userId_to_notify_cl_update,
                    value: data.message,
                    event: data.event,
                    from: data.from 
                }));
                console.log(`SUCCESSFULLY SENT FAILED TRADE MSG`);
            }

        }
    })
}


export async function orderBookUpdate() {
    sub.on('message', (channel, message) => {
        if (channel === CHANNEL) {
            const data = JSON.parse(message);

            userConnections.forEach(ws => {
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({
                        buy: data.buy,
                        sell: data.sell,
                        event: data.event,
                        from: data.from
                    }));
                    console.log(`SUCCESSFULLY SENT UPDATED PRICE`);
                }
            });

        }
    })
}

// Event Name	Type	Description
// TRADE_EXECUTED	Private	Confirms that a trade (BUY/SELL) is finished and successful.
// TRADE_FAILED	Private	Informs the user why their trade failed (e.g., Insufficient funds).
// PRICE_TICKER	Public	Live price changes (e.g., BTC/USD at $65,000.50).
// BALANCE_UPDATE	Private	Real-time update of the user's wallet after fees or trade completion.
// ORDERBOOK_UPDATE	Public	Real-time changes in market depth (new bids/asks).

// CLOSE_TRADE_EXECUTED
// CLOSE_TRADE_FAILED
