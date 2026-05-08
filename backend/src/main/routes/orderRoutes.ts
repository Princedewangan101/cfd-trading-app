import { Router } from 'express';
import { marketOrder } from '../handlers/marketOrder.js';
import { limitOrder } from '../handlers/limitOrder.js';

const router = Router()

router.post('/market', marketOrder)
router.post('/limit', limitOrder)

export default router 