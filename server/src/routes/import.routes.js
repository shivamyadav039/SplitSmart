import { Router } from 'express';
import multer from 'multer';
import * as importController from '../controllers/import.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/parse', authMiddleware, upload.single('file'), importController.parse);
router.post('/confirm', authMiddleware, importController.confirm);

export default router;
