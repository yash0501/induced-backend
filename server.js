// Production server wrapper
console.log('Starting server from JavaScript build...');
try {
  // Check if dist folder exists and app.js is there
  const fs = require('fs');
  if (fs.existsSync('./dist/app.js')) {
    require('./dist/app.js');
  } else {
    console.error('Error: dist/app.js not found!');
    console.log('Contents of current directory:');
    console.log(fs.readdirSync('.'));
    
    if (fs.existsSync('./dist')) {
      console.log('Contents of dist directory:');
      console.log(fs.readdirSync('./dist'));
    } else {
      console.error('dist directory not found!');
    }
    
    // Simple express server as fallback
    const express = require('express');
    const app = express();
    const port = process.env.PORT || 3000;
    
    app.get('/', (req, res) => {
      res.send('Build error - compiled app not found. Please check logs.');
    });
    
    app.listen(port, () => {
      console.log(`Fallback server running on port ${port}`);
    });
  }
} catch (error) {
  console.error('Failed to start server:', error);
}
