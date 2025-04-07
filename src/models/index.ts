import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'production' ? false : console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Import models
import User from './user.model';
import ApiKey from './apiKey.model';
import RateLimitStrategy from './rateLimitStrategy.model';
import RegisteredApp from './registeredApp.model';
import RateLimitConfig from './rateLimitConfig.model';
import RequestLog from './requestLog.model';
import RequestQueue from './requestQueue.model';
import { DataTypes } from 'sequelize';

// Initialize models
User.initialize(sequelize);
ApiKey.initialize(sequelize);
RateLimitStrategy.initialize(sequelize);
RegisteredApp.initialize(sequelize);
RateLimitConfig.initialize(sequelize);
RequestLog.initialize(sequelize);
RequestQueue.initialize(sequelize);

// Define associations
User.associate();
ApiKey.associate();
RateLimitStrategy.associate();
RegisteredApp.associate();
RateLimitConfig.associate();
RequestLog.associate();
RequestQueue.associate();

export {
  sequelize,
  User,
  ApiKey,
  RateLimitStrategy,
  RegisteredApp,
  RateLimitConfig,
  RequestLog,
  RequestQueue
};
