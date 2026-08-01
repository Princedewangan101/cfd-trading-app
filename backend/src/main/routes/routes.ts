import { Router } from 'express';
import { balance } from '../handlers/getBalance.js';
import { signup } from '../authHandlers/signup.js';
import { signin } from '../authHandlers/signin.js';
import { withdraw } from '../handlers/withdraw.js';
import { deposit } from '../handlers/deposit.js';
import { modify } from '../handlers/modify.js';
import { closeOrder } from '../handlers/closeOrder.js';
import { limitOrder } from '../handlers/limitOrder.js';
import { marketOrder } from '../handlers/marketOrder.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { candles } from '../handlers/getCandles.js';
import { sseHandler } from '../sse/sse.js';

const router = Router()

router.get('/balance', authMiddleware, balance)
router.get('/candles/:symbol/:timeFrame', candles)

router.post('/market', authMiddleware, marketOrder)
router.post('/limit', authMiddleware, limitOrder)
router.post('/close', authMiddleware, closeOrder)
router.post('/modify', authMiddleware, modify)


router.post('/deposit', authMiddleware, deposit)
router.post('/withdraw', authMiddleware, withdraw)

router.post('/signin', signin)
router.post('/signup', signup)

router.get('/events', sseHandler)


export default router