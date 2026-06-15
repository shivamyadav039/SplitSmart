import { Router } from 'express';
import * as commentsController from '../controllers/comments.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

// mergeParams: true allows access to parent route params (like expenseId)
const router = Router({ mergeParams: true });

router.get('/', authMiddleware, commentsController.getComments);
router.post('/', authMiddleware, commentsController.postComment);

export default router;
