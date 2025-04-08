import { Router } from 'express';
import ProxyController from '../controllers/proxy.controller';
import { authenticateJwt, authenticateApiKey } from '../middleware/auth.middleware';

const router = Router();

// Allow either JWT or API key authentication for proxy requests
const authenticate = [authenticateApiKey, authenticateJwt];

// Proxy endpoint that captures all paths after the app ID
router.all('/:appId/*', authenticate, ProxyController.proxyRequest);

// Also handle requests directly to the app endpoint without additional path
router.all('/:appId', authenticate, ProxyController.proxyRequest);

export default router;
