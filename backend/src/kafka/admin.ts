import { kafka } from './client.js'

async function init() {
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
        topics: [
            {
                topic: "execute-trade",
                numPartitions: 2,
            }
        ]
    })

    await admin.disconnect();
}

init();