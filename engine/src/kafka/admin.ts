import { kafka } from './client.js'

async function init() {
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
        topics: [
            {
                topic: "trade-result",
                numPartitions: 2,
            }
        ]
    })

    await admin.disconnect();
}

init();