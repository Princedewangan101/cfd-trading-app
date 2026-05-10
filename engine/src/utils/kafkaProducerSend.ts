import { producer } from "../kafka/producer.js";

export async function kafkaProducerSend(topic: string, value: string): Promise<void> {
    await producer.send({
        topic: topic,
        messages: [{
            value: value,
        }]
    })
}