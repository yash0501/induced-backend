import Bull from 'bull';
import { RequestQueue } from '../models';
import axios from 'axios';
import { decrypt } from '../utils/encryption';
import { RegisteredApp } from '../models';

// Create the request queue
const apiRequestQueue = new Bull('apiRequests', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});

// Process queued requests
apiRequestQueue.process(async (job) => {
  const { queueId, requestConfig } = job.data;
  const queuedRequest = await RequestQueue.findByPk(queueId);
  
  if (!queuedRequest) {
    throw new Error(`Queued request with ID ${queueId} not found`);
  }
  
  try {
    // Update status to processing
    await queuedRequest.update({ 
      status: 'processing', 
      processedAt: new Date() 
    });
    
    // Add option to handle SSL certificate issues in development
    if (process.env.NODE_ENV !== 'production') {
      requestConfig.httpsAgent = new (require('https').Agent)({
        rejectUnauthorized: false
      });
    }
    
    // Fix headers for the external API call - remove problematic headers
    if (requestConfig.headers) {
      // Remove host header which is causing issues
      delete requestConfig.headers.host;
      // Remove headers that may be causing problems
      delete requestConfig.headers['x-api-key']; // This is for our API, not for the external API
      
      // Some APIs might reject requests with authorization headers they don't recognize
      if (requestConfig.url.includes('jsonplaceholder.typicode.com')) {
        delete requestConfig.headers.authorization;
      }
    }
    
    // Execute the API request
    const response = await axios(requestConfig);
    
    // Update status to completed
    await queuedRequest.update({ 
      status: 'completed'
    });
    
    return {
      requestId: queueId,
      status: response.status,
      headers: response.headers,
      data: response.data
    };
  } catch (error) {
    // Update status to failed
    await queuedRequest.update({ 
      status: 'failed' 
    });
    
    throw error;
  }
});

// Define queue events for logging and monitoring
apiRequestQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed with result: ${result.status}`);
});

apiRequestQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed with error:`, error);
});

/**
 * Queue an API request for processing
 */
export async function queueApiRequest(
  appId: string,
  userId: number,
  requestMethod: string,
  requestPath: string,
  requestHeaders: Record<string, string>,
  requestBody: any,
  priority: number = 5
): Promise<{ queueId: number, estimatedWaitMs: number }> {
  try {
    // Fetch app details to get baseUrl and API key
    const app = await RegisteredApp.findOne({
      where: { appId }
    });
    
    if (!app) {
      throw new Error(`App with ID ${appId} not found`);
    }
    
    // Prepare API URL
    const targetUrl = `${app.baseUrl}/${requestPath}`.replace(/\/+/g, '/').replace(':/', '://');
    
    // Clean up headers for external API call
    const cleanHeaders = { ...requestHeaders };
    // Remove headers that shouldn't be forwarded
    delete cleanHeaders.host;
    delete cleanHeaders['x-api-key']; // Our API key, not for external API
    
    // Only add specific external API key if it exists
    if (app.apiKey) {
      try {
        const decryptedApiKey = decrypt(app.apiKey);
        if (app.apiKeyHeaderName.toLowerCase() === 'authorization') {
          if (!decryptedApiKey.startsWith('Bearer ') && 
              !decryptedApiKey.startsWith('Basic ')) {
            cleanHeaders[app.apiKeyHeaderName] = `Bearer ${decryptedApiKey}`;
          } else {
            cleanHeaders[app.apiKeyHeaderName] = decryptedApiKey;
          }
        } else {
          cleanHeaders[app.apiKeyHeaderName] = decryptedApiKey;
        }
      } catch (error) {
        console.error('Error decrypting API key:', error);
      }
    } else {
      // For public APIs, remove any existing authorization headers
      delete cleanHeaders.authorization;
    }
    
    // Save request to database
    const queuedRequest = await RequestQueue.create({
      appId,
      userId,
      requestMethod,
      requestPath,
      requestHeaders: cleanHeaders,
      requestBody: typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody),
      priority,
      createdAt: new Date(),
      scheduledAt: new Date(Date.now() + 1000 * priority), // Priority affects scheduling
      status: 'pending'
    });
    
    // Prepare request config with clean headers
    const requestConfig = {
      method: requestMethod,
      url: targetUrl,
      headers: cleanHeaders,
      data: requestBody,
      responseType: 'arraybuffer',
      validateStatus: () => true,
      // Add option to handle SSL certificate issues in development
      ...(process.env.NODE_ENV !== 'production' && {
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      })
    };
    
    // Add to Bull queue with priority
    const job = await apiRequestQueue.add(
      {
        queueId: queuedRequest.id,
        requestConfig
      },
      {
        priority,
        delay: priority * 1000 // Simple delay based on priority
      }
    );
    
    // Get estimated wait time
    const waitingCount = await apiRequestQueue.getWaitingCount();
    const estimatedWaitMs = waitingCount * 500 + (priority * 1000); // Rough estimate
    
    return {
      queueId: queuedRequest.id,
      estimatedWaitMs
    };
  } catch (error) {
    console.error('Error queueing API request:', error);
    throw error;
  }
}

/**
 * Get status of a queued request
 */
export async function getQueuedRequestStatus(queueId: number): Promise<any> {
  const queuedRequest = await RequestQueue.findByPk(queueId);
  
  if (!queuedRequest) {
    throw new Error(`Queued request with ID ${queueId} not found`);
  }
  
  // Return status information
  return {
    id: queuedRequest.id,
    status: queuedRequest.status,
    createdAt: queuedRequest.createdAt,
    scheduledAt: queuedRequest.scheduledAt,
    processedAt: queuedRequest.processedAt
  };
}

// Export the queue instance for use elsewhere
export { apiRequestQueue };
