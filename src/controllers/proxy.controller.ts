import { Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { RegisteredApp, RequestLog } from '../models';
import { decrypt } from '../utils/encryption';
import { checkRateLimit } from '../services/rateLimit.service';
import { getQueuedRequestStatus } from '../services/queue.service';

// Define types to avoid import issues
type Method = 'get' | 'GET' | 'delete' | 'DELETE' | 'head' | 'HEAD' | 'options' | 'OPTIONS' | 'post' | 'POST' | 'put' | 'PUT' | 'patch' | 'PATCH' | 'purge' | 'PURGE' | 'link' | 'LINK' | 'unlink' | 'UNLINK';

type AxiosRequestConfig = {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: any;
  responseType?: string;
  validateStatus?: (status: number) => boolean;
};

export default class ProxyController {
  // Handle proxy request
  static async proxyRequest(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { appId } = req.params;
    const userId = (req as any).user.userId;
    const path = req.params[0] || '';
    let isQueued = false;
    let queueTime = 0;

    try {
      // Find the registered app
      const app = await RegisteredApp.findOne({
        where: { appId }
      });

      if (!app) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }

      // Check if user is authorized to use this app
      if (app.userId !== userId) {
        res.status(403).json({ message: 'Not authorized to use this application' });
        return;
      }

      // Check rate limits - pass request details for queueing
      const rateLimitCheck = await checkRateLimit(
        appId, 
        userId, 
        req.method, 
        path, 
        req.headers as Record<string, string>, 
        req.body
      );

      if (rateLimitCheck.limited) {
        if (rateLimitCheck.queueEnabled && rateLimitCheck.queueId) {
          // Request is queued, return queue status
          isQueued = true;
          queueTime = rateLimitCheck.queueTimeMs || 0;
          
          await logRequest(appId, userId, path, req.method, 202, startTime, isQueued, queueTime);
          
          res.status(202).json({
            message: 'Request has been queued due to rate limiting',
            queueId: rateLimitCheck.queueId,
            estimatedWaitTimeMs: queueTime,
            statusEndpoint: `/api/queue/${rateLimitCheck.queueId}/status`
          });
          return;
        } else {
          // Rate limited and not queued, return 429
          await logRequest(appId, userId, path, req.method, 429, startTime, false, 0);
          res.status(429).json({
            message: 'Rate limit exceeded',
            retryAfter: rateLimitCheck.retryAfter || 60
          });
          return;
        }
      }

      // Prepare URL for the target API
      const targetUrl = `${app.baseUrl}/${path}`.replace(/\/+/g, '/').replace(':/', '://');
      
      // Prepare headers
      const headers: Record<string, string> = {};
      
      // Copy only safe headers, exclude problematic ones
      Object.entries(req.headers).forEach(([key, value]) => {
        if (!['host', 'connection', 'content-length', 'x-api-key', 'authorization'].includes(key.toLowerCase()) && 
            !key.toLowerCase().startsWith('accept-encoding')) {
          headers[key] = value as string;
        }
      });
      
      // Add API key if available
      if (app.apiKey) {
        try {
          const decryptedApiKey = decrypt(app.apiKey);
          if (app.apiKeyHeaderName.toLowerCase() === 'authorization') {
            if (!decryptedApiKey.startsWith('Bearer ') && 
                !decryptedApiKey.startsWith('Basic ')) {
              headers[app.apiKeyHeaderName] = `Bearer ${decryptedApiKey}`;
            } else {
              headers[app.apiKeyHeaderName] = decryptedApiKey;
            }
          } else {
            headers[app.apiKeyHeaderName] = decryptedApiKey;
          }
        } catch (error) {
          console.error('Error decrypting API key:', error);
        }
      }
      
      // Special handling for public APIs
      if (app.baseUrl.includes('jsonplaceholder.typicode.com')) {
        console.log('Using JSONPlaceholder API - clearing authentication headers');
        delete headers.authorization;
        delete headers.Authorization;
      }
      
      // Prepare request config
      const axiosConfig: AxiosRequestConfig = {
        method: req.method as Method,
        url: targetUrl,
        headers,
        data: req.body,
        responseType: 'arraybuffer', // Handle binary responses correctly
        validateStatus: () => true, // Don't throw on any status code
        // Add option to handle SSL certificate issues in development
        ...(process.env.NODE_ENV !== 'production' && {
          httpsAgent: new https.Agent({
            rejectUnauthorized: false
          })
        })
      };
      
      // Send the request to the target API
      const response = await axios(axiosConfig as any);
      
      // Set headers from the response
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value !== undefined && !['connection', 'transfer-encoding'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      
      // Log the request
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      await logRequest(appId, userId, path, req.method, response.status, 
                      processingTime, isQueued, queueTime);
      
      // Send the response
      res.status(response.status).send(response.data);
      
    } catch (error) {
      console.error('Proxy error:', error);
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Log the failed request
      await logRequest(appId, userId, path, req.method, 500, 
                      processingTime, isQueued, queueTime);
      
      res.status(500).json({ message: 'Error proxying request to target API' });
    }
  }

  // Get status of a queued request
  static async getQueueStatus(req: Request, res: Response): Promise<void> {
    try {
      const { queueId } = req.params;
      
      // Get queue status
      const status = await getQueuedRequestStatus(parseInt(queueId));
      
      res.status(200).json(status);
    } catch (error) {
      console.error('Get queue status error:', error);
      res.status(404).json({ message: 'Queued request not found' });
    }
  }
}

// Helper function to log requests
async function logRequest(
  appId: string, 
  userId: number, 
  requestPath: string, 
  requestMethod: string, 
  responseStatus: number, 
  processingTimeMs: number, 
  queued: boolean, 
  queueTimeMs: number
): Promise<void> {
  try {
    await RequestLog.create({
      appId,
      userId,
      requestPath,
      requestMethod,
      responseStatus,
      processingTimeMs,
      queued,
      queueTimeMs
    });
  } catch (error) {
    console.error('Error logging request:', error);
  }
}
