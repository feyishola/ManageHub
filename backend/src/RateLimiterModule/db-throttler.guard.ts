import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimiterService } from '../rate-limiter.service';

@Injectable()
export class DbThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(DbThrottlerGuard.name);

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly rateLimiterService: RateLimiterService,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const route = request.path;
    const method = request.method;

    // Extract user role if authenticated
    const user = (request as any).user;
    const userRole: string | undefined = user?.role;

    // Look up DB-driven limit
    const dbLimit = await this.rateLimiterService.findMatchingLimit(route, method, userRole);

    if (dbLimit) {
      // Apply DB-driven throttle logic manually
      const key = this.buildKey(request, userRole);
      const ttl = dbLimit.windowSeconds * 1000;

      try {
        const storageKey = `db-throttle:${key}`;
        // Use the storage service to track hits
        const { totalHits } = await (this as any).storageService.increment(
          storageKey,
          ttl,
          dbLimit.maxRequests,
          dbLimit.windowSeconds,
          'default',
        );

        if (totalHits > dbLimit.maxRequests) {
          response.setHeader('Retry-After', dbLimit.windowSeconds);
          response.setHeader('X-RateLimit-Limit', dbLimit.maxRequests);
          response.setHeader('X-RateLimit-Remaining', 0);
          response.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + dbLimit.windowSeconds);

          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'Too many requests. Please wait before retrying.',
              retryAfter: dbLimit.windowSeconds,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        const remaining = Math.max(0, dbLimit.maxRequests - totalHits);
        response.setHeader('X-RateLimit-Limit', dbLimit.maxRequests);
        response.setHeader('X-RateLimit-Remaining', remaining);
        response.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + dbLimit.windowSeconds);

        return true;
      } catch (err) {
        if (err instanceof HttpException) throw err;
        this.logger.error('DB throttler storage error, falling through to default', err);
      }
    }

    // Fall through to default @nestjs/throttler behavior
    try {
      return await super.canActivate(context);
    } catch (err: any) {
      if (err?.status === 429 || err?.getStatus?.() === 429) {
        const options = (this as any).options;
        const defaultTtl =
          Array.isArray(options?.throttlers)
            ? options.throttlers[0]?.ttl ?? 60
            : options?.ttl ?? 60;

        response.setHeader('Retry-After', defaultTtl);
      }
      throw err;
    }
  }

  private buildKey(request: Request, userRole?: string): string {
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const user = (request as any).user;
    const userId = user?.id ?? ip;
    return `${userId}:${request.method}:${request.path}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse<Response>();
    const ttl = Math.ceil((throttlerLimitDetail?.timeToExpire ?? 60000) / 1000);
    response.setHeader('Retry-After', ttl);
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
