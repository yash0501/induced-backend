#!/bin/bash
echo "Building TypeScript application..."
npm install
npm run build
echo "Build completed. Checking for dist/app.js..."
if [ -f "dist/app.js" ]; then
  echo "✅ Build successful - dist/app.js exists"
else
  echo "❌ Build failed - dist/app.js does not exist"
  exit 1
fi
