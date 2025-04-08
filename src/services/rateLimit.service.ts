import { RegisteredApp, RateLimitConfig, RateLimitStrategy, RequestLog } from '../models';
import { Op } from 'sequelize';
import { queueApiRequest } from './queue.service';

// Interface for the additionalParams object in RateLimitConfig
interface RateLimitAdditionalParams {
  enableQueue?: boolean;
  queuePriority?: number;
  [key: string]: any; // Allow for other properties
}

// Interface for rate limit check result
interface RateLimitResult {
  limited: boolean;
  queueEnabled: boolean;
  queueTimeMs?: number;
  queueId?: number;
  retryAfter?: number;
  queuedResponse?: {
    status: number;
    headers?: Record<string, string>;
    data?: any;
  };
}

/**
 * Check if a request should be rate limited
 */
export async function checkRateLimit(
  appId: string, 
  userId: number,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: any
): Promise<RateLimitResult> {
  try {
    // Get app and rate limit config
    const app = await RegisteredApp.findOne({
      where: { appId },
      include: [
        {
          model: RateLimitConfig,
          as: 'rateLimitConfig',
          include: [
            {
              model: RateLimitStrategy,
              as: 'strategy'
            }
          ]
        }
      ]
    });

    if (!app || !app.rateLimitConfig) {
      return { limited: false, queueEnabled: false };
    }

    const config = app.rateLimitConfig;
    const strategy = app.rateLimitConfig.strategy;

    // Check for queue configuration in additionalParams
    const queueEnabled = (config.additionalParams as RateLimitAdditionalParams)?.enableQueue === true;

    // Apply the appropriate rate limiting strategy
    let result: RateLimitResult = { limited: false, queueEnabled: false };
    switch (strategy?.name) {
      case 'fixedWindow':
        result = await checkFixedWindowRateLimit(appId, userId, config);
        break;
      case 'slidingWindow':
        result = await checkSlidingWindowRateLimit(appId, userId, config);
        break;
      case 'tokenBucket':
        result = await checkTokenBucketRateLimit(appId, userId, config);
        break;
      default:
        // Calculate priority (1-10, lower number = higher priority)
        const priority = (config.additionalParams as RateLimitAdditionalParams)?.queuePriority || 5;
        // No valid strategy, use default result
    }

    // If rate limited and queueing is enabled, queue the request
    if (result.limited && queueEnabled) {
      try {
        // Calculate priority (1-10, lower number = higher priority)
        const priority = (config.additionalParams as RateLimitAdditionalParams)?.queuePriority || 5;
        
        // Queue the request
        const queueResult = await queueApiRequest(
          appId,
          userId,
          method,
          path,
          headers,
          body,
          priority
        );
        
        // Update result with queue info
        result.queueEnabled = true;
        result.queueTimeMs = queueResult.estimatedWaitMs;
        result.queueId = queueResult.queueId;
      } catch (error) {
        console.error('Error queueing request:', error);
        // If queueing fails, just return rate limited without queue
        result.queueEnabled = false;
      }
    }

    return result;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // In case of error, allow the request to proceed
    return { limited: false, queueEnabled: false };
  }
}

/**
 * Fixed Window Rate Limiting Strategy
 * Counts all requests in the current time window and limits if threshold exceeded
 */
async function checkFixedWindowRateLimit(
  appId: string, 
  userId: number, 
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const timeWindowMs = config.timeWindowSeconds * 1000;
  const windowStart = new Date(Date.now() - timeWindowMs);
  
  // Count requests in the current window
  const requestCount = await RequestLog.count({
    where: {
      appId,
      userId,
      timestamp: {
        [Op.gte]: windowStart
      }
    }
  });
  
  // Check if the limit is exceeded
  if (requestCount >= config.requestCount) {
    // Calculate retry after in seconds
    const oldestRequest = await RequestLog.findOne({
      where: {
        appId,
        userId,
        timestamp: {
          [Op.gte]: windowStart
        }
      },
      order: [['timestamp', 'ASC']]
    });
    
    let retryAfter = 60; // Default
    if (oldestRequest) {
      const oldestTime = new Date(oldestRequest.timestamp).getTime();
      const windowExpiry = oldestTime + timeWindowMs;
      retryAfter = Math.ceil((windowExpiry - Date.now()) / 1000);
      if (retryAfter < 0) retryAfter = 1;
    }
    
    return {
      limited: true,
      queueEnabled: false, // Enable queue if implemented
      retryAfter
    };
  }
  
  return { limited: false, queueEnabled: false };
}

/**
 * Sliding Window Rate Limiting Strategy
 * Gives more weight to recent requests by considering partial windows
 */
async function checkSlidingWindowRateLimit(
  appId: string, 
  userId: number, 
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Simple implementation for now - can be enhanced with weighted calculations
  const timeWindowMs = config.timeWindowSeconds * 1000;
  const windowStart = new Date(Date.now() - timeWindowMs);
  
  // Count requests in the sliding window
  const requestCount = await RequestLog.count({
    where: {
      appId,
      userId,
      timestamp: {
        [Op.gte]: windowStart
      }
    }
  });
  
  // Check if the limit is exceeded
  if (requestCount >= config.requestCount) {
    // Get the approximate time until a slot becomes available
    const nextAvailableSlot = await RequestLog.findOne({
      where: {
        appId,
        userId,
        timestamp: {
          [Op.gte]: windowStart
        }
      },
      order: [['timestamp', 'ASC']]
    });
    
    let retryAfter = 60; // Default
    if (nextAvailableSlot) {
      retryAfter = Math.ceil(
        (new Date(nextAvailableSlot.timestamp).getTime() + timeWindowMs - Date.now()) / 1000
      );
      if (retryAfter < 0) retryAfter = 1;
    }
    
    return {
      limited: true,
      queueEnabled: false,
      retryAfter
    };
  }
  
  return { limited: false, queueEnabled: false };
}

/**
 * Token Bucket Rate Limiting Strategy 
 * A simple implementation - in a real app this would use Redis with token generation
 */
async function checkTokenBucketRateLimit(
  appId: string, 
  userId: number, 
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // For this implementation, we'll use the fixed window approach
  // but could be enhanced with actual token tracking in Redis
  return checkFixedWindowRateLimit(appId, userId, config);
}
