import { Kafka } from 'kafkajs';
import jwt from 'jsonwebtoken';
import { CustomWebSocket } from '../types';
import createClient from 'ioredis';
import { pub, redis } from '../redis';
import { balanceUpdate, priceUpdate, tradeExecuted, tradeFailed } from './subscribe';

// KAFKA CONSUMER PUBLISH THE MESSAGE DATA INTO CHANNEL
const kafka = new Kafka({ brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'realtime-group' });

await consumer.connect();
await consumer.subscribe({ topic: 'trade-result-for-client-fe', fromBeginning: false });

const CHANNEL = 'TRADE_UPDATES';


await consumer.run({
    eachMessage: async ({ message }) => {
        if (!message.value) throw new Error("MESSAGE NOT FOUND  !!");
        const parsedData = JSON.parse(message.value.toString());
        const { value, event, from } = parsedData;

        switch (event) {
            case value: "TRADE_EXECUTED"
                const { userId } = value;

                const broadCastData_for_executed = { userId, value, event, from }
                await pub.publish(CHANNEL, JSON.stringify(broadCastData_for_executed));
                await tradeExecuted()
                break;

            case value: "TRADE_FAILED"
                const { userId_of_failed_trade, errorMessage } = value;
                const broadCastData_for_failed = { userId_of_failed_trade, errorMessage, event, from }
                await pub.publish(CHANNEL, JSON.stringify(broadCastData_for_failed));
                await tradeFailed()
                break;

            case value: "PRICE_TICKER"
                const { latestData } = value;
                const priceBroadCastData = { latestData, event, from }
                await pub.publish(CHANNEL, JSON.stringify(priceBroadCastData));
                await priceUpdate()
                break;

            case value: "BALANCE_UPDATE"
                const { userId_for_balance } = value
                const liveBalanceUpdateData = { userId_for_balance, value, event, from }
                await pub.publish(CHANNEL, JSON.stringify(liveBalanceUpdateData));
                await balanceUpdate()
                break;

            case value: "CLOSE_TRADE_EXECUTED"
                break;

            case value: "CLOSE_TRADE_FAILED"
                break;

            // TODO AFTER OB
            // case value: "ORDERBOOK_UPDATE"
            //     break;

            default:
                break;
        }
    },
});
