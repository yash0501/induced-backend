-- Create Tables for Rate Limiting Proxy API

-- User Table - Store user information
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ApiKey Table - Store API keys for authentication
CREATE TABLE "ApiKey" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "keyValue" VARCHAR(64) UNIQUE NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "fkUser" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- RateLimitStrategy Table - Define available rate limiting strategies
CREATE TABLE "RateLimitStrategy" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) UNIQUE NOT NULL,
    "description" TEXT
);

-- Insert default rate limiting strategies
INSERT INTO "RateLimitStrategy" ("name", "description") 
VALUES 
    ('fixedWindow', 'Fixed window rate limiting - reset counter after each time window'),
    ('slidingWindow', 'Sliding window rate limiting - gradual expiration of request counts'),
    ('tokenBucket', 'Token bucket algorithm - tokens regenerate at a fixed rate');

-- RegisteredApp Table - Store information about registered third-party APIs
CREATE TABLE "RegisteredApp" (
    "id" SERIAL PRIMARY KEY,
    "appId" VARCHAR(36) UNIQUE NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "baseUrl" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "apiKey" VARCHAR(255),
    "isApiKeyEncrypted" BOOLEAN DEFAULT TRUE,
    "apiKeyHeaderName" VARCHAR(100) DEFAULT 'Authorization',
    CONSTRAINT "fkAppUser" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- RateLimitConfig Table - Store rate limiting configs for each app
CREATE TABLE "RateLimitConfig" (
    "id" SERIAL PRIMARY KEY,
    "appId" VARCHAR(36) NOT NULL,
    "strategyId" INTEGER NOT NULL,
    "requestCount" INTEGER NOT NULL,
    "timeWindowSeconds" INTEGER NOT NULL,
    "additionalParams" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "isOwnerExempt" BOOLEAN DEFAULT FALSE,
    CONSTRAINT "fkApp" FOREIGN KEY ("appId") REFERENCES "RegisteredApp"("appId"),
    CONSTRAINT "fkStrategy" FOREIGN KEY ("strategyId") REFERENCES "RateLimitStrategy"("id")
);

-- RequestLog Table - Track API usage and rate limits
CREATE TABLE "RequestLog" (
    "id" SERIAL PRIMARY KEY,
    "appId" VARCHAR(36) NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestPath" TEXT NOT NULL,
    "requestMethod" VARCHAR(10) NOT NULL,
    "responseStatus" INTEGER,
    "processingTimeMs" INTEGER,
    "queued" BOOLEAN DEFAULT FALSE,
    "queueTimeMs" INTEGER DEFAULT 0,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fkLogApp" FOREIGN KEY ("appId") REFERENCES "RegisteredApp"("appId"),
    CONSTRAINT "fkLogUser" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- RequestQueue Table - Store queued requests when rate limits are hit
CREATE TABLE "RequestQueue" (
    "id" SERIAL PRIMARY KEY,
    "appId" VARCHAR(36) NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestHeaders" JSONB NOT NULL,
    "requestBody" TEXT,
    "requestMethod" VARCHAR(10) NOT NULL,
    "requestPath" TEXT NOT NULL,
    "priority" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "scheduledAt" TIMESTAMP WITH TIME ZONE,
    "processedAt" TIMESTAMP WITH TIME ZONE,
    "status" VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    CONSTRAINT "fkQueueApp" FOREIGN KEY ("appId") REFERENCES "RegisteredApp"("appId"),
    CONSTRAINT "fkQueueUser" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- Create indexes for performance optimization
CREATE INDEX "idxApiKeyUserId" ON "ApiKey"("userId");
CREATE INDEX "idxApiKeyKeyValue" ON "ApiKey"("keyValue");
CREATE INDEX "idxRegisteredAppUserId" ON "RegisteredApp"("userId");
CREATE INDEX "idxRegisteredAppAppId" ON "RegisteredApp"("appId");
CREATE INDEX "idxRegisteredAppApiKey" ON "RegisteredApp"("apiKey");
CREATE INDEX "idxRateLimitConfigAppId" ON "RateLimitConfig"("appId");
CREATE INDEX "idxRequestLogAppId" ON "RequestLog"("appId");
CREATE INDEX "idxRequestLogTimestamp" ON "RequestLog"("timestamp");
CREATE INDEX "idxRequestQueueAppId" ON "RequestQueue"("appId");
CREATE INDEX "idxRequestQueueStatus" ON "RequestQueue"("status");
