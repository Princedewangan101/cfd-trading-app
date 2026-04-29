import { Router } from 'express'
import { openTrade } from '../handler/tradeHandlers/opentrade.js';
import { closeTrade } from '../handler/tradeHandlers/closetrade.js';
import { deposit } from '../handler/inOutHandler/deposit.js';
import { withdraw } from '../handler/inOutHandler/withdraw.js';
import { balance } from '../handler/inOutHandler/getBalance.js';

const router = Router();

router.post("/open", openTrade)
router.post("/close", closeTrade)
router.post("/deposit", deposit)
router.post("/deposit", withdraw)
router.post("/deposit", balance)


export default router

// HAVE TO RUN THIS COMMAND
// docker run -p 2181:2181 zookeeper

// ANOTHER TERMINAL
// docker run -p 9892:9892 \
// -e KAFKA_ZOOKEEPER_CONNECT = <PRIVATE_IP>:2181 \
// -e KAFKA_ADVERTISED_LISTENERS = PLAINTEXT://<PRIVATE_IP>:9092 \
// -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR = 1 \
// confluentinc/cp-kafka