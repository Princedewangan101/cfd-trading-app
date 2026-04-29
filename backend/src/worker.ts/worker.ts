import { parentPort } from 'worker_threads';
import { redis } from '../configs/redis.js';
import { addOrderIntoDb } from '../consumer_fn/addOrderIntoDb.js';
import { addClosePrice } from '../consumer_fn/addClosePrice.js';

const resolvers = new Map();

parentPort?.on("message", async (parsedData) => {
    if (!parsedData) throw new Error("message OR message.value NOT FOUND !")
    const { id, task, } = parsedData;
    
    try {
        const resolve = resolvers.get(`${id}`)

        if (resolve) {
            switch (task) {
                case "ADD_INTO_DB":
                    const return1 = await addOrderIntoDb(parsedData)
                    resolve(return1);
                    redis.set(`RESOLVER-STATUS-ID:${id} :`, "DONE")
                    break;

                case "ADD_CLOSING_PRICE":
                    await addClosePrice(parsedData)
                    break;

                default:
                    break;
            }
        }

        parentPort?.postMessage({ status: 'SUCCESS', id: task === "ADD_INTO_DB" ? id : null })

    } catch (error: any) {
        console.log("ERROR : ", error);
        parentPort?.postMessage({ status: 'ERROR', id: task === "ADD_INTO_DB" ? id : null })
        throw new Error(error.message)
    }
})


async function waitForMessage(id: string) {
    return new Promise((resolve) => {
        resolvers.set(id, resolve)
        redis.set(`RESOLVER-STATUS-ID:${id} :`, "UNDONE")

        setInterval(async () => {
            let status = await redis.get(`RESOLVER-STATUS-ID:${id} :`)
            if (status === "DONE") {
                resolvers.delete(id)
            }
        }, 10000)
    })
}