import { kafka } from "./kafkaInstance.js";


const producer = kafka.producer({
    allowAutoTopicCreation: false,
    transactionTimeout: 30000
});

await producer.connect();

export default producer;