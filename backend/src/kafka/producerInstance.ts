
import { kafka } from './client.js'


const producer = kafka.producer({
    allowAutoTopicCreation: false,
    transactionTimeout: 30000
});
await producer.connect();

export default producer;
