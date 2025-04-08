# Deployment Checklist

## Before Deployment
- [ ] Run `npm run build` and verify it completes successfully
- [ ] Run `npm run test-prod` and verify the application starts correctly
- [ ] Check all environment variables are properly set up
- [ ] Ensure database migrations will run correctly
- [ ] Verify all dependencies are in the `dependencies` section of package.json (not just `devDependencies`)

## Common Issues
- Path-related errors: Make sure paths use `path.join()` or `path.resolve()`
- Missing environment variables: Check for proper defaults
- Case sensitivity issues: Ensure correct casing in all imports (important for Linux)
- TypeScript not compiling: Check tsconfig.json settings
- Database connection errors: Verify connection strings and credentials

## Post-Deployment Verification
- [ ] Check application logs for errors
- [ ] Test all critical API endpoints
- [ ] Verify database connections are working
- [ ] Check rate limiting functionality
- [ ] Test queue processing
