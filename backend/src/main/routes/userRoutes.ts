import { Router } from 'express';
import { balance } from '../handlers/getBalance.js';

const router = Router()

router.post('/balance', balance)

export default router