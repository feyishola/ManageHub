# RateLimiterModule

DB-driven rate limiting for NestJS using `@nestjs/throttler` with per-route, per-role targeting, in-memory cache, and `Retry-After` headers.

## Structure

```
backend/src/rate-limiter/
  rate-limiter.module.ts              # Module wiring + global guard registration
  rate-limiter.service.ts             # CRUD + cache + limit resolution logic
  rate-limiter.controller.ts          # Admin REST endpoints
  entities/rate-limit.entity.ts       # TypeORM entity
  dto/create-rate-limit.dto.ts        # CreateRateLimitDto + UpdateRateLimitDto
  guards/db-throttler.guard.ts        # Extended ThrottlerGuard reading DB limits
  enums/apply-to.enum.ts              # ApplyTo enum values
  migrations/1700000000000-CreateRateLimitsTable.ts
```

## Setup

### 1. Install dependency
```bash
npm install @nestjs/throttler
```

### 2. Import in AppModule
```typescript
import { RateLimiterModule } from './rate-limiter/rate-limiter.module';

@Module({
  imports: [RateLimiterModule],
})
export class AppModule {}
```

### 3. Run migration
```bash
npm run migration:run
```

## Global Defaults

- **100 requests / 60 seconds** applied to all routes unless overridden via DB config.

## API Endpoints (admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/rate-limits` | List all configured limits |
| `GET` | `/rate-limits/:id` | Get single limit |
| `POST` | `/rate-limits` | Create custom route limit |
| `PATCH` | `/rate-limits/:id` | Update limit |
| `DELETE` | `/rate-limits/:id` | Remove limit (reverts to global default) |

## `applyTo` Values

| Value | Applies To |
|-------|-----------|
| `all` | Every request (authenticated or not) |
| `unauthenticated` | Requests without a valid JWT |
| `role:admin` | Requests from users with role `admin` |
| `role:user` | Requests from users with role `user` |
| `role:moderator` | Requests from users with role `moderator` |

**Priority (highest first):** `role:*` > `unauthenticated` > `all`

## Cache

DB limits are cached in-memory for **5 minutes**. Cache is automatically invalidated on any create / update / delete operation.

## Response Headers

On every rate-limited response:
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 23
X-RateLimit-Reset: 1700000060
```

On `429 Too Many Requests`:
```
Retry-After: 60
X-RateLimit-Remaining: 0
```

## Example: Create a custom limit

```bash
curl -X POST /rate-limits \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "route": "/api/auth/login",
    "method": "POST",
    "maxRequests": 5,
    "windowSeconds": 60,
    "applyTo": "unauthenticated"
  }'
```

## Wiring the Admin Guard

The controller has commented-out guard decorators. Uncomment and adjust them to your auth setup:

```typescript
// In rate-limiter.controller.ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('rate-limits')
```
