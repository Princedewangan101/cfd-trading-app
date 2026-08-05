import { Router } from 'express';
import { balance } from '../handlers/getBalance.js';
import { getOrders } from '../handlers/getOrders.js';
import { signup } from '../authHandlers/signup.js';
import { signin } from '../authHandlers/signin.js';
import { withdraw } from '../handlers/withdraw.js';
import { deposit } from '../handlers/deposit.js';
import { modify } from '../handlers/modify.js';
import { closeOrder } from '../handlers/closeOrder.js';
import { closeAllOrders } from '../handlers/closeAllOrders.js';
import { limitOrder } from '../handlers/limitOrder.js';
import { marketOrder } from '../handlers/marketOrder.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rateLimitAuth } from '../middleware/rateLimit.js';
import { candles } from '../handlers/getCandles.js';
import { sseHandler } from '../sse/sse.js';
import { validateBody, validateParams } from '../validation/validate.js';
import {
    marketOrderSchema,
    limitOrderSchema,
    depositSchema,
    withdrawSchema,
    closeOrderSchema,
    modifySchema,
    candlesParamsSchema,
} from '../validation/schemas.js';

const router = Router()

router.get('/balance', authMiddleware, balance)
router.get('/orders', authMiddleware, getOrders)
router.get('/candles/:symbol/:timeFrame', validateParams(candlesParamsSchema), candles)

router.post('/market', authMiddleware, validateBody(marketOrderSchema), marketOrder)
router.post('/limit', authMiddleware, validateBody(limitOrderSchema), limitOrder)
router.post('/close', authMiddleware, validateBody(closeOrderSchema), closeOrder)
router.post('/close-all', authMiddleware, closeAllOrders)
router.post('/modify', authMiddleware, validateBody(modifySchema), modify)


router.post('/deposit', authMiddleware, validateBody(depositSchema), deposit)
router.post('/withdraw', authMiddleware, validateBody(withdrawSchema), withdraw)

router.post('/signin', rateLimitAuth, signin)
router.post('/signup', rateLimitAuth, signup)

router.get('/events', authMiddleware, sseHandler)


export default router