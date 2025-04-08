# Project Assumptions

This document outlines the key assumptions made during the development of the Rate Limiting Proxy API.

## Technical Assumptions

### Authentication & Authorization

1. **User Registration**: We assume that users must register before using the service and that email addresses are unique identifiers.

2. **API Key Ownership**: Each API key belongs to exactly one user, and a user can have multiple API keys.

3. **App Ownership**: Applications (registered APIs) are private to the user who registered them. No sharing mechanism is implemented.

### Rate Limiting

1. **Strategy Implementation**: We've implemented three common rate limiting strategies (fixed window, sliding window, token bucket) but assume these will be sufficient for most use cases.

2. **Database-backed Counting**: Rate limit counting is performed using database queries rather than in-memory counters, assuming that persistence and accuracy are more important than absolute performance.

3. **Single Instance Deployment**: While the database approach supports distributed deployments, the current implementation assumes a single proxy instance for simplicity.

### Proxy Functionality

1. **URL Pattern Preservation**: We assume that the path structure after the app ID should be preserved exactly as provided when forwarding to the target API.

2. **Headers Handling**: We assume that most headers should be preserved when forwarding requests, except for a few specific ones (host, connection, etc.).

3. **API Key Forwarding**: For APIs requiring authentication, we assume the API key will be provided by the user during app registration, and that it should be forwarded in the header specified by the user.

4. **SSL/TLS Requirements**: We assume target APIs might use HTTPS and handle SSL certificate verification accordingly.

### Queueing

1. **Redis Availability**: The queuing mechanism assumes the availability of a Redis instance for Bull queue management.

2. **Queue Priorities**: We assume requests can have different priority levels, and that higher priority requests should be processed first.

3. **Automatic Processing**: We assume queued requests should be automatically processed when rate limits allow, without requiring client intervention.

## Business Assumptions

1. **User Needs**: We assume users need this service primarily to prevent rate limit errors when interacting with third-party APIs that have strict rate limits.

2. **API Variety**: We assume users will connect to a wide variety of APIs with different authentication mechanisms and rate limiting behaviors.

3. **No Billing Tier**: The current implementation doesn't include a billing system, assuming this is either a free service or that billing would be handled by an external system.

4. **No Multi-tenancy**: We don't currently implement organization-level access controls or role-based permissions, assuming individual user accounts are sufficient.

## Infrastructure Assumptions

1. **PostgreSQL Database**: We assume a PostgreSQL database is available and properly configured.

2. **Redis Instance**: For queuing functionality, we assume a Redis instance is available.

3. **Node.js Environment**: We assume deployment on a Node.js-compatible environment.

4. **Environment Variables**: We assume environment variables will be properly set in the deployment environment.

## Security Assumptions

1. **JWT Security**: We assume JWT tokens provide sufficient security for authentication.

2. **API Key Storage**: We assume API keys should be encrypted when stored in the database.

3. **Headers Security**: We assume certain headers might contain sensitive information and should be handled carefully.

4. **No MITM Protection**: The current implementation doesn't include specific protections against man-in-the-middle attacks beyond standard HTTPS.

## Future Considerations

1. **Horizontal Scaling**: The current implementation would need modifications to support horizontal scaling of proxy instances.

2. **Custom Rate Limiting Strategies**: Users might require more specialized rate limiting strategies in the future.

3. **Analytics Dashboard**: A visual dashboard would help users understand their API usage and rate limit status.

4. **Webhook Notifications**: Users might want notifications when rate limits are approaching or when queued requests complete.
