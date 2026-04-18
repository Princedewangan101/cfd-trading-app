import { closeTrade, openTrade } from "../consumer_fn/consumerFn.js";
import { kafka } from "./client.js";

const consumer = kafka.consumer({ groupId: "executive-engine" });

await consumer.connect()
await consumer.subscribe({ topic: "execute-trade", fromBeginning: true })

await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {

        try {
            if (!message || !message.value) throw new Error("message OR message.value NOT FOUND !")

            const parsedData = JSON.parse(message.value.toString() as string)

            if (!parsedData) throw new Error("message OR message.value NOT FOUND !")

            const id = parsedData.id;
            const task = parsedData.data.task;

            switch (task) {
                case "OPEN_TRADE":
                    await openTrade(id, parsedData.data);
                    break;

                case "CLOSE_TRADE":
                    await closeTrade(id, parsedData.data);
                    break;

                default:
                    break;
            }
        } catch (error: any) {
            console.log("ERROR : ", error);
            throw new Error(error.message)
        }

    }
})