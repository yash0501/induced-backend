import { Router } from 'express';
import AppController from '../controllers/app.controller';
import { authenticateJwt, authenticateApiKey } from '../middleware/auth.middleware';

const router = Router();

// Protected routes - can use either JWT or API key authentication
router.post('/', authenticateJwt, AppController.registerApp);
router.get('/', authenticateJwt, AppController.getUserApps);
router.get('/:appId', authenticateJwt, AppController.getAppDetails);
router.put('/:appId', authenticateJwt, AppController.updateApp);
router.delete('/:appId', authenticateJwt, AppController.deleteApp);

export default router;
