import { redis } from '../configs/redis.js';
import { addOrderIntoDb, closeOrderIntoDb } from '../consumer_fn/consumerFn.js';
import { kafka } from './client.js'

const consumer = kafka.consumer({
    groupId: 'execute-group'
});

await consumer.connect();
await consumer.subscribe({ topic: "trade-result", fromBeginning: true })

await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {

        try {
            if (!message || !message.value) throw new Error("message OR message.value NOT FOUND !")

            const parsedData = JSON.parse(message.value.toString() as string)

            if (!parsedData) throw new Error("message OR message.value NOT FOUND !")

            const result = await redis.get(`GET-RESOLVE-FOR-ID:${parsedData.id}`)
            if (!result) throw new Error("RESOLVE-FN NOT FOUND !")
            const resolve = JSON.parse(result);

            const task = parsedData.task;

            switch (task) {
                case "ADD_ORDER_INTO_DB_N_REDIS":
                    const ADD_ORDER_INTO_DB_result = await addOrderIntoDb(parsedData);

                    // AFTER RESOLVE THE CLIENT RECEIVE AN OBJ 
                    resolve(ADD_ORDER_INTO_DB_result);
                    break;

                case "CLOSE_ORDER_INTO_DB_N_REDIS":
                    const CLOSE_ORDER_INTO_DB_result = await closeOrderIntoDb(parsedData);
                    resolve(CLOSE_ORDER_INTO_DB_result)
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

export async function waitForMessage(id: string,) {
    return new Promise((resolve, reject) => {
        redis.set(`GET-RESOLVE-FOR-ID:${id}`, JSON.stringify({ resolve }))
    })

}




