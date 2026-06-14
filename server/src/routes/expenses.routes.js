import { Router } from 'express';
import * as expensesController from '../controllers/expenses.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authMiddleware, expensesController.create);

export default router;
