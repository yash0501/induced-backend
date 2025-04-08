// Simple script to test production deployment locally
const { exec } = require('child_process');

console.log('🔨 Building application...');
exec('npm run build', (err, stdout, stderr) => {
  if (err) {
    console.error('❌ Build failed:', stderr);
    return;
  }
  
  console.log('✅ Build successful!');
  console.log('🚀 Starting application in production mode...');
  
  const app = exec('NODE_ENV=production node dist/app.js');
  
  app.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });
  
  app.stderr.on('data', (data) => {
    console.error('❌ Error:', data.toString().trim());
  });
  
  console.log('Press Ctrl+C to stop the application');
});
