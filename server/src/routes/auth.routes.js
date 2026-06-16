import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/me', authMiddleware, authController.getMe);
router.get('/users', authMiddleware, authController.getUsers);
router.post('/users', authMiddleware, authController.createUser);

export default router;
