import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import appRoutes from './routes/app.routes';
import proxyRoutes from './routes/proxy.routes'; // Import proxy routes
import queueRoutes from './routes/queue.routes'; // Import queue routes
import { sequelize } from './models';
import axios from 'axios';
import https from 'https';

// Load environment variables
dotenv.config();

// Configure axios defaults for all requests - proper way to set the agent
axios.defaults.headers.common['User-Agent'] = 'rate-limit-proxy';

// Create a custom instance with the HTTPS agent for development
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Only for development
});

// Use the agent in our requests by adding an interceptor with proper typing
axios.interceptors.request.use((config: any) => {
  // Use 'any' type to bypass TypeScript's strict checking
  config.httpsAgent = httpsAgent;
  return config;
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/apps', appRoutes);
app.use('/apis', proxyRoutes); // This is the proxy endpoint
app.use('/api/queue', queueRoutes); // This is the queue endpoint

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database or start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();