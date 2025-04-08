# Rate Limiting Proxy API

This project is a proxy API service that handles rate limiting for third-party APIs. It acts as an intermediary layer between clients and their target APIs, managing rate limits transparently.

## Project Structure

```
rate-limiting-proxy-api
├── src
│   ├── app.ts                # Entry point of the application
│   ├── controllers           # Contains route controllers
│   ├── routes                # Defines application routes
│   ├── middleware            # Middleware functions
│   ├── models                # Data models or schemas
│   ├── services              # Business logic services
│   └── utils                 # Utility functions
├── tests                     # Test cases for the application
├── package.json              # NPM configuration file
├── tsconfig.json             # TypeScript configuration file
├── .env.example              # Example environment variables
├── .gitignore                # Git ignore file
└── README.md                 # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd rate-limiting-proxy-api
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Environment Setup:**
   - Copy `.env.example` to `.env`
   - Configure your database connection:
     ```
     DATABASE_URL="postgresql://username:password@host:port/database"
     REDIS_HOST="your-redis-host"
     REDIS_PORT="your-redis-port"
     REDIS_PASSWORD="your-redis-password"
     JWT_SECRET="your-jwt-secret"
     ```

4. **Start the application:**
   - For development:
     ```
     npm run dev
     ```
   - For production:
     ```
     npm run build
     npm start
     ```

## API Endpoints

### Authentication

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/auth/register` | POST | Register a new user | `{ "email": "user@example.com", "password": "password", "name": "User Name" }` | User details with JWT token |
| `/api/auth/login` | POST | Login to existing account | `{ "email": "user@example.com", "password": "password" }` | User details with JWT token |
| `/api/auth/api-key` | POST | Generate a new API key | *No body, requires JWT auth* | New API key |

### Application Management

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/apps` | POST | Register a new third-party API | See [App Registration](#app-registration) | App details with ID |
| `/api/apps` | GET | List all registered apps | *No body, requires auth* | List of apps |
| `/api/apps/:appId` | GET | Get details of a specific app | *No body, requires auth* | App details |
| `/api/apps/:appId` | PUT | Update an existing app | See [App Update](#app-update) | Updated app details |
| `/api/apps/:appId` | DELETE | Delete an app | *No body, requires auth* | Success message |

### Proxy

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/apis/:appId/*` | ANY | Proxy request to target API | *Any body, passed through* | Response from target API |
| `/api/queue/:queueId/status` | GET | Check status of queued request | *No body, requires auth* | Queue status |

## Rate Limiting Strategies

The system implements three rate limiting strategies:

### 1. Fixed Window

The fixed window strategy counts requests in fixed time periods (e.g., per minute or hour). When the window expires, the counter resets.

**Pros:**
- Simple to implement and understand
- Low memory footprint

**Cons:**
- Can allow "bursts" at window boundaries

**Configuration parameters:**
- `requestCount`: Maximum number of requests in the window
- `timeWindowSeconds`: Duration of the window in seconds

### 2. Sliding Window

The sliding window strategy provides a more fluid approach by considering requests over a continuously moving time window.

**Pros:**
- Smoother rate limiting than fixed window
- No sudden bursts at window boundaries

**Cons:**
- More complex to implement
- Higher memory usage

**Configuration parameters:**
- `requestCount`: Maximum number of requests in the window
- `timeWindowSeconds`: Duration of the window in seconds

### 3. Token Bucket

The token bucket strategy models rate limiting as tokens in a bucket. Each request consumes a token, and tokens are replenished at a fixed rate.

**Pros:**
- Allows for occasional bursts of traffic
- Maintains a consistent average rate

**Cons:**
- More complex to implement
- Requires more state management

**Configuration parameters:**
- `requestCount`: Maximum bucket size (token capacity)
- `timeWindowSeconds`: Time to replenish all tokens (divided by requestCount gives replenish rate)

## Advanced Rate Limiting Techniques

### Implementation Details

1. **Database-backed Rate Limiting**
   - Our implementation uses PostgreSQL to track request counts
   - Provides persistence across server restarts
   - Supports distributed deployments with multiple proxy instances

2. **Redis-based Queue Management**
   - Uses Bull queue library backed by Redis
   - Provides reliable job processing with automatic retries
   - Supports prioritization of requests

3. **Adaptive Rate Limiting**
   - The system can dynamically adjust rate limits based on:
     - Time of day (configurable through `additionalParams`)
     - Server load conditions
     - Client importance (priority levels)

### Rate Limit Headers

The API includes standard rate limit headers in responses:
- `X-RateLimit-Limit`: The maximum number of requests allowed
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: The time when the rate limit will reset (Unix timestamp)
- `Retry-After`: When rate limited, the seconds to wait before retrying

### Queue Management

When a request exceeds rate limits and queuing is enabled:
1. The request is stored in the `RequestQueue` table
2. A Bull job is created with the specified priority
3. The client receives a 202 Accepted response with queue information
4. The queued request is processed when the rate limit allows
5. Request status can be checked via the queue status endpoint

### Circuit Breaking

For better resilience, the proxy implements circuit breaking:
1. Tracks failures to the target API
2. Temporarily stops forwarding requests when failure threshold is exceeded
3. Periodically tests if the target API has recovered
4. Gradually restores traffic when the API is healthy again

This prevents overwhelming an already struggling API service.


## Usage Examples

### App Registration

```bash
curl -X POST http://localhost:3000/api/apps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "OpenAI API",
    "baseUrl": "https://api.openai.com/v1",
    "description": "OpenAI API for chat completions",
    "apiKey": "sk-your-openai-api-key",
    "apiKeyHeaderName": "Authorization",
    "rateLimitConfig": {
      "strategyName": "fixedWindow",
      "requestCount": 100,
      "timeWindowSeconds": 3600,
      "additionalParams": {
        "enableQueue": true,
        "queuePriority": 3
      }
    }
  }'
```

### App Update

```bash
curl -X PUT http://localhost:3000/api/apps/YOUR_APP_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated OpenAI API",
    "rateLimitConfig": {
      "strategyName": "slidingWindow",
      "requestCount": 150,
      "timeWindowSeconds": 3600
    }
  }'
```

### Proxy Request

```bash
curl -X POST "http://localhost:3000/apis/YOUR_APP_ID/chat/completions" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello world"}]
  }'
```

### Queue Status Check

```bash
curl -X GET "http://localhost:3000/api/queue/QUEUE_ID/status" \
  -H "X-API-Key: YOUR_API_KEY"
```

## Features

- **API Key Management**: Secure authentication using API keys
- **Multiple Rate Limiting Strategies**: Choose the strategy that fits your needs
- **Request Queueing**: Automatically queue requests when rate limits are approached
- **Transparent Proxying**: Maintain header and payload integrity
- **Detailed Logging**: Track all requests for better analytics

## Database Schema

The application uses PostgreSQL for data storage with the following main tables:
- `User`: User account information
- `ApiKey`: API keys for authentication
- `RateLimitStrategy`: Available rate limiting strategies
- `RegisteredApp`: Registered third-party APIs
- `RateLimitConfig`: Rate limiting configuration for each app
- `RequestLog`: Log of API requests
- `RequestQueue`: Queue for rate-limited requests

## Deployment

The application can be deployed to any Node.js hosting environment. For production, we recommend:
- Setting `NODE_ENV=production`
- Using a production-ready PostgreSQL database
- Using a production Redis instance for queuing
- Setting up proper SSL certificates
