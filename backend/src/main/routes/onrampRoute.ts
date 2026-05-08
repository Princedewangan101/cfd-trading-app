import { Router } from 'express';
import { deposit } from '../handlers/deposit.js';
import { withdraw } from '../handlers/withdraw.js';

const router = Router()

router.post('/deposit', deposit)
router.post('/withdraw', withdraw)

export default router