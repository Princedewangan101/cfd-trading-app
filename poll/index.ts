import "dotenv";
import { WebSocket } from "ws";
import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId: "exness-app-1",
    brokers: ["localhost:9092"],
});

const ws = new WebSocket(process.env.BACKPACK_WS_URL as string);
const producer = kafka.producer();
await producer.connect();

let latestData: Record<string, { price: number; decimal: number }> = {};

export const startPoller = async () => {
    ws.on("open", () => {
        ws.send(
            JSON.stringify({
                method: "SUBSCRIBE",
                params: ["trade.ETH_USDC", "trade.SOL_USDC", "trade.BTC_USDC"],
                id: 1,
            })
        );
    });

    ws.on("error", console.error);

    ws.on("message", async (data: any) => {
        const parsedData = JSON.parse(data.toString());

        latestData[parsedData.data.s] = {
            price: Math.round(Number(parsedData.data.p) * 1000),
            decimal: 2,
        };
        console.log(JSON.stringify(latestData));
    });

    ws.on("close", () => {
        console.log("closing ws connection with backpack");
        setTimeout(startPoller, 1000);
    });
};

const startInterval = async () => {
    const sendData = async () => {
        if (latestData) {
            console.log("sending data to kafka", Date.now());
            try {
                await producer.send({
                    topic: "price",
                    messages: [{ value: JSON.stringify({ latestData, event: 'PRICE_TICKER', from: "poller" }) }],
                });
            } catch (error) {
                console.log("error sending data to kafka", error);
            }
        }
        setTimeout(sendData, 100);
    };

    sendData();
};

startPoller();
startInterval();