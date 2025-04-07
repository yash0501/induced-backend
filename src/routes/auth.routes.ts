import { Router } from 'express';
import AuthController from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.post('/api-key', authenticateJwt, AuthController.generateApiKey);

export default router;
