import { Request, Response } from 'express';
import { User, ApiKey } from '../models';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

console.log('Using JWT_SECRET (auth controller):', JWT_SECRET);

export default class AuthController {
  // Register a new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(409).json({ message: 'User with this email already exists' });
        return;
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await User.create({
        email,
        passwordHash,
        name: name || null
      });

      // Generate JWT token with proper types
      const token = jwt.sign(
        { userId: user.id }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN } as SignOptions
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Error registering user' });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      // Generate JWT token with proper types
      const token = jwt.sign(
        { userId: user.id }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN } as SignOptions
      );

      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error during login' });
    }
  }

  // Generate new API key
  static async generateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      
      // Deactivate existing API keys
      await ApiKey.update(
        { isActive: false },
        { where: { userId, isActive: true } }
      );

      // Create new API key
      const apiKey = await ApiKey.create({
        userId,
        keyValue: uuidv4(),
        isActive: true
      });

      res.status(201).json({
        message: 'New API key generated',
        apiKey: apiKey.keyValue
      });
    } catch (error) {
      console.error('API key generation error:', error);
      res.status(500).json({ message: 'Error generating API key' });
    }
  }
}
