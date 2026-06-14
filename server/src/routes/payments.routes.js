import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authMiddleware, paymentsController.create);
router.get('/group/:groupId', authMiddleware, paymentsController.getHistory);

export default router;
