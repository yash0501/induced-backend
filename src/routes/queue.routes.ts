import { Router } from 'express';
import ProxyController from '../controllers/proxy.controller';
import { authenticateJwt, authenticateApiKey } from '../middleware/auth.middleware';

const router = Router();

// Allow either JWT or API key authentication
const authenticate = [authenticateApiKey, authenticateJwt];

// Queue status endpoint
router.get('/:queueId/status', authenticate, ProxyController.getQueueStatus);

export default router;
