import { match } from "../consumer_fns/match.js";
import { kafka } from "./kafkaInstance.js";


const consumer = kafka.consumer({
    groupId: 'matching-grp-1'
});

await consumer.connect();
await consumer.subscribe({ topic: "order-matching", fromBeginning: true });

await consumer.run({
    eachMessage: async ({ message }) => {

        try {
            if (!message || !message.value) throw new Error("message OR message.value NOT FOUND !")

            const parsedData = JSON.parse(message.value.toString() as string)

            if (!parsedData) throw new Error("message OR message.value NOT FOUND !")

            const { id, orderData, dataToSaveInDb, type, timestamp, task, from } = parsedData;

            switch (task) {
                case "match":
                    await match(id, orderData, dataToSaveInDb, type, timestamp, from)
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

// JSON.stringify({id, value: orderData, dataToSaveInDb, type, timestamp, task: 'match', from: "engine" })

// const dataToSaveInDb = {
//             id, userId, pair, quantity, openPrice, closePrice, type, pnl, requiredBalance, requiredBalanceWithFee, Fee, liquidatePrice,
//             task: TradeStatus.ADD_ORDER_INTO_DB_N_REDIS, timestamp
//         }