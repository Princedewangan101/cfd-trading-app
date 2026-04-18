import { string } from 'zod';
import { kafka } from './client.js'
import { waitForMessage } from './consumer.js';

const producer = kafka.producer({
    allowAutoTopicCreation: false,
    transactionTimeout: 30000
});

await producer.connect();


export async function kafkaProducer(data: any) {

    const id = "123"

    await producer.send({
        topic: "execute-trade",
        messages: [
            {value: JSON.stringify({ value: data, id, from: "backend" }), partition: 0 }
        ]
    })

    return await waitForMessage(id);
}



 