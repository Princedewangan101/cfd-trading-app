import { string } from 'zod';
import { kafka } from './client.js'
import { waitForMessage } from './consumer.js';
import CircuitBreaker from 'opossum';
import type { ADD_ORDER_INTO_DB_RESULT_TYPE, CLOSE_ORDER_INTO_DB_RESULT_TYPE } from '../../types.js';

const producer = kafka.producer({
    allowAutoTopicCreation: false,
    transactionTimeout: 30000
});
await producer.connect();

const options = {
    timeout: 3000,   
    errorThresholdPercentage: 50,
    resetTimeout: 30000
}

const breaker = new CircuitBreaker(EventPublisher, options);

export async function kafkaProducer(data: any) {
    return await breaker.fire(data)
}

export async function EventPublisher(data: any) {
    const id = Math.random().toString(36).substring(7);

    await producer.send({
        topic: "validate-order-data",
        messages: [
            { value: JSON.stringify({ value: data, id, from: "backend" }), partition: 0 }
        ]
    })

    if (data.task === "OPEN_TRADE") {
        return await waitForMessage<ADD_ORDER_INTO_DB_RESULT_TYPE>(id);
    } else {
        return await waitForMessage<CLOSE_ORDER_INTO_DB_RESULT_TYPE>(id);
    }
}

// PROVIDE GRACEFULL ERROR MESSAGE TO CLIENT
breaker.fallback(() => {
    throw new Error("CIRCUIT_BREAKER_OPEN");
});


breaker.on('open', () => console.log('--- BREAKER OPEN ---'));
breaker.on('close', () => console.log('--- BREAKER CLOSED ---'));


