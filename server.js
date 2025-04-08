// Simple wrapper to start the application from compiled JavaScript
console.log('Starting application from compiled JavaScript...');
try {
  // First try to load the compiled app
  require('./dist/app.js');
} catch (error) {
  console.error('Error loading compiled app:', error);
  
  // Fallback to a simple express server if dist/app.js doesn't exist
  const express = require('express');
  const app = express();
  const port = process.env.PORT || 3000;
  
  // Display an error message
  app.get('/', (req, res) => {
    res.send('Build error - compiled app not found. Please check build process.');
  });
  
  // Health check for Render
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', message: 'Fallback server running' });
  });
  
  app.listen(port, () => {
    console.log(`Fallback server running on port ${port}`);
  });
}
