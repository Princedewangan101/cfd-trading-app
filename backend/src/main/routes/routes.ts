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

const router = Router()

router.get('/balance', balance)

router.post('/market', marketOrder)
router.post('/limit', limitOrder)
router.post('/close', closeOrder)
router.post('/modify', modify)


router.post('/deposit', deposit)
router.post('/withdraw', withdraw)

router.post('/signin', signin)
router.post('/signup', signup)


export default router