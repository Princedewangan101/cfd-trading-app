import { string } from 'zod';
import { kafka } from './client.js'

const producer = kafka.producer({
    allowAutoTopicCreation: false,
    transactionTimeout: 30000
});

await producer.connect();

export default producer;

// export async function kafkaProducer(data: any) {

//     const id = "123"

//     await producer.send({
//         topic: "trade-result",
//         messages: [
//             { key: String(id), value: JSON.stringify({ value: data, id, from: "engine" }), partition: 0 }
//         ]
//     })

// }

