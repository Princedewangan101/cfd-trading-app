import type { ADD_ORDER_INTO_DB_RESULT_TYPE, CLOSE_ORDER_INTO_DB_RESULT_TYPE } from '../../types.js';
import { kafka } from './client.js'
import { Worker } from "worker_threads";
import path from "path";

const WORKER_COUNT = 4;
const workers: { worker: Worker, status: 'BUSY' | 'FREE' }[] = [];

for (let i = 0; i < WORKER_COUNT; i++) {

    const worker = new Worker(path.resolve("./dist/workers/tradeWorker.js"))

    workers.push({ worker, status: 'FREE' })

    // listem for completion
    worker.on("message", (message) => { 
        
    })

}


const consumer = kafka.consumer({ groupId: 'execute-group' });

await consumer.connect();
await consumer.subscribe({ topic: "order-matching-result", fromBeginning: true });


await consumer.run({
    eachMessage: async ({ message }) => {

        try {
            if (!message || !message.value) throw new Error("message OR message.value NOT FOUND !")

            const parsedData = JSON.parse(message.value.toString() as string)

            if (!parsedData) throw new Error("message OR message.value NOT FOUND !")


            let freeWorker = getFreeWorker();

            while (!freeWorker) {
                await new Promise(resolve => setTimeout(resolve, 5));
                freeWorker = getFreeWorker();
            }

            freeWorker.status = 'BUSY';
            freeWorker.worker.postMessage(parsedData);

        } catch (error: any) {
            console.log("ERROR : ", error);
            throw new Error(error.message)
        }

    }
})

function getFreeWorker() {
    return workers.find(w => w.status === 'FREE');
}





