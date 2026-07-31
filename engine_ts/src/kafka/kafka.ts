import { Kafka } from 'kafkajs'


export const kafka = new Kafka({
    clientId: 'my-nodejs-app',
    brokers: ['localhost:9092'],
    retry: {
        initialRetryTime: 100,
        retries: 8
    }
});

