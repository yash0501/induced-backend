import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RegisteredApp, RateLimitConfig, RateLimitStrategy } from '../models';
import { encrypt } from '../utils/encryption'; // Placeholder for encryption utility

export default class AppController {
  // Register a new external API
  static async registerApp(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { 
        name, 
        baseUrl, 
        description, 
        apiKey, 
        apiKeyHeaderName,
        rateLimitConfig 
      } = req.body;

      // Validate required fields
      if (!name || !baseUrl || !rateLimitConfig) {
        res.status(400).json({ 
          message: 'Name, baseUrl, and rateLimitConfig are required' 
        });
        return;
      }

      // Validate rate limit config
      const { strategyName, requestCount, timeWindowSeconds, additionalParams } = rateLimitConfig;
      
      if (!strategyName || !requestCount || !timeWindowSeconds) {
        res.status(400).json({ 
          message: 'Rate limit configuration must include strategyName, requestCount, and timeWindowSeconds' 
        });
        return;
      }

      // Find strategy by name
      const strategy = await RateLimitStrategy.findOne({ 
        where: { name: strategyName } 
      });

      if (!strategy) {
        res.status(400).json({ 
          message: `Rate limiting strategy '${strategyName}' not found` 
        });
        return;
      }

      // Generate unique appId
      const appId = uuidv4();

      // Process API key if provided
      let encryptedApiKey = null;
      if (apiKey) {
        // In a real application, encrypt this API key
        encryptedApiKey = encrypt(apiKey);
      }

      // Create registered app
      const app = await RegisteredApp.create({
        appId,
        userId,
        name,
        baseUrl,
        description: description || null,
        apiKey: encryptedApiKey,
        isApiKeyEncrypted: encryptedApiKey !== null,
        apiKeyHeaderName: apiKeyHeaderName || 'Authorization'
      });

      // Create rate limit configuration
      const config = await RateLimitConfig.create({
        appId,
        strategyId: strategy.id,
        requestCount,
        timeWindowSeconds,
        additionalParams: additionalParams || null
      });

      res.status(201).json({
        message: 'Application registered successfully',
        app: {
          id: app.id,
          appId: app.appId,
          name: app.name,
          baseUrl: app.baseUrl,
          description: app.description,
          hasApiKey: app.apiKey !== null,
          apiKeyHeaderName: app.apiKeyHeaderName,
          createdAt: app.createdAt
        },
        rateLimitConfig: {
          id: config.id,
          strategyName: strategy.name,
          requestCount: config.requestCount,
          timeWindowSeconds: config.timeWindowSeconds,
          additionalParams: config.additionalParams
        }
      });
    } catch (error) {
      console.error('App registration error:', error);
      res.status(500).json({ message: 'Error registering application' });
    }
  }

  // Get all apps for a user
  static async getUserApps(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;

      // Find all apps for this user
      const apps = await RegisteredApp.findAll({
        where: { userId },
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
        ],
        order: [['createdAt', 'DESC']]
      });

      // Map to a safer response format that excludes sensitive data
      const safeApps = apps.map(app => ({
        id: app.id,
        appId: app.appId,
        name: app.name,
        baseUrl: app.baseUrl,
        description: app.description,
        hasApiKey: app.apiKey !== null,
        apiKeyHeaderName: app.apiKeyHeaderName,
        createdAt: app.createdAt,
        rateLimitConfig: app.rateLimitConfig && app.rateLimitConfig.strategy ? {
          id: app.rateLimitConfig.id,
          strategyName: app.rateLimitConfig.strategy.name,
          requestCount: app.rateLimitConfig.requestCount,
          timeWindowSeconds: app.rateLimitConfig.timeWindowSeconds,
          additionalParams: app.rateLimitConfig.additionalParams
        } : null
      }));

      res.status(200).json({ apps: safeApps });
    } catch (error) {
      console.error('Get user apps error:', error);
      res.status(500).json({ message: 'Error retrieving user applications' });
    }
  }

  // Get app details
  static async getAppDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { appId } = req.params;

      // Find app with this appId that belongs to the user
      const app = await RegisteredApp.findOne({
        where: { appId, userId },
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

      if (!app) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }

      // Return a safe version without sensitive data
      const safeApp = {
        id: app.id,
        appId: app.appId,
        name: app.name,
        baseUrl: app.baseUrl,
        description: app.description,
        hasApiKey: app.apiKey !== null,
        apiKeyHeaderName: app.apiKeyHeaderName,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        rateLimitConfig: app.rateLimitConfig && app.rateLimitConfig.strategy ? {
          id: app.rateLimitConfig.id,
          strategyName: app.rateLimitConfig.strategy.name,
          requestCount: app.rateLimitConfig.requestCount,
          timeWindowSeconds: app.rateLimitConfig.timeWindowSeconds,
          additionalParams: app.rateLimitConfig.additionalParams
        } : null
      };

      res.status(200).json({ app: safeApp });
    } catch (error) {
      console.error('Get app details error:', error);
      res.status(500).json({ message: 'Error retrieving application details' });
    }
  }

  // Update app details
  static async updateApp(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { appId } = req.params;
      const { 
        name, 
        baseUrl, 
        description, 
        apiKey, 
        apiKeyHeaderName,
        rateLimitConfig
      } = req.body;

      // Find app with this appId that belongs to the user
      const app = await RegisteredApp.findOne({
        where: { appId, userId },
        include: [{ model: RateLimitConfig, as: 'rateLimitConfig' }]
      });

      if (!app) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }

      // Update app fields if provided
      const updates: any = {};
      if (name) updates.name = name;
      if (baseUrl) updates.baseUrl = baseUrl;
      if (description !== undefined) updates.description = description;
      if (apiKeyHeaderName) updates.apiKeyHeaderName = apiKeyHeaderName;
      
      // Process API key if provided
      if (apiKey) {
        // In a real application, encrypt this API key
        updates.apiKey = encrypt(apiKey);
        updates.isApiKeyEncrypted = true;
      }

      // Update the app
      if (Object.keys(updates).length > 0) {
        await app.update(updates);
      }

      // Update rate limit config if provided
      if (rateLimitConfig) {
        const { strategyName, requestCount, timeWindowSeconds, additionalParams } = rateLimitConfig;
        
        // Validate required fields
        if (!strategyName || !requestCount || !timeWindowSeconds) {
          res.status(400).json({ 
            message: 'Rate limit configuration must include strategyName, requestCount, and timeWindowSeconds' 
          });
          return;
        }

        // Find strategy by name
        const strategy = await RateLimitStrategy.findOne({ 
          where: { name: strategyName } 
        });

        if (!strategy) {
          res.status(400).json({ 
            message: `Rate limiting strategy '${strategyName}' not found` 
          });
          return;
        }

        // Update or create rate limit config
        if (app.rateLimitConfig) {
          await app.rateLimitConfig.update({
            strategyId: strategy.id,
            requestCount,
            timeWindowSeconds,
            additionalParams: additionalParams || null
          });
        } else {
          await RateLimitConfig.create({
            appId,
            strategyId: strategy.id,
            requestCount,
            timeWindowSeconds,
            additionalParams: additionalParams || null
          });
        }
      }

      // Get updated app details
      const updatedApp = await RegisteredApp.findOne({
        where: { appId, userId },
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

      if (!updatedApp) {
        res.status(404).json({ message: 'Updated app not found' });
        return;
      }

      // Return a safe version without sensitive data
      const safeApp = {
        id: updatedApp.id,
        appId: updatedApp.appId,
        name: updatedApp.name,
        baseUrl: updatedApp.baseUrl,
        description: updatedApp.description,
        hasApiKey: updatedApp.apiKey !== null,
        apiKeyHeaderName: updatedApp.apiKeyHeaderName,
        createdAt: updatedApp.createdAt,
        updatedAt: updatedApp.updatedAt,
        rateLimitConfig: updatedApp.rateLimitConfig && updatedApp.rateLimitConfig.strategy ? {
          id: updatedApp.rateLimitConfig.id,
          strategyName: updatedApp.rateLimitConfig.strategy.name,
          requestCount: updatedApp.rateLimitConfig.requestCount,
          timeWindowSeconds: updatedApp.rateLimitConfig.timeWindowSeconds,
          additionalParams: updatedApp.rateLimitConfig.additionalParams
        } : null
      };

      res.status(200).json({ 
        message: 'Application updated successfully',
        app: safeApp 
      });
    } catch (error) {
      console.error('Update app error:', error);
      res.status(500).json({ message: 'Error updating application' });
    }
  }

  // Delete an app
  static async deleteApp(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { appId } = req.params;

      // Find app with this appId that belongs to the user
      const app = await RegisteredApp.findOne({
        where: { appId, userId }
      });

      if (!app) {
        res.status(404).json({ message: 'Application not found' });
        return;
      }

      // Delete the app (cascading will handle related records)
      await app.destroy();

      res.status(200).json({ 
        message: 'Application deleted successfully',
        appId
      });
    } catch (error) {
      console.error('Delete app error:', error);
      res.status(500).json({ message: 'Error deleting application' });
    }
  }
}
