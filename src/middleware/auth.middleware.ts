import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, ApiKey } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Interface for JWT payload
interface JwtPayload {
  userId: number;
}

// Middleware to verify JWT token
export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'JWT token missing' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Attach user to request object
    (req as any).user = { userId: decoded.userId };
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to verify API key
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKeyHeader = req.headers['x-api-key'];
    
    if (!apiKeyHeader) {
      res.status(401).json({ message: 'API key required' });
      return;
    }

    // Find API key
    const apiKey = await ApiKey.findOne({
      where: { keyValue: apiKeyHeader.toString(), isActive: true }
    });

    if (!apiKey) {
      res.status(401).json({ message: 'Invalid API key' });
      return;
    }

    // Update last used timestamp
    await apiKey.update({ lastUsedAt: new Date() });

    // Attach user to request object
    (req as any).user = { userId: apiKey.userId };
    next();
  } catch (error) {
    console.error('API key verification error:', error);
    res.status(401).json({ message: 'Error validating API key' });
  }
};
