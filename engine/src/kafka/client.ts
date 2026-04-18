import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
    clientId: 'excness',
    brokers: ["<PRIVATE_IP>:9092"],
})