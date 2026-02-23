import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

import { RateLimit } from './entities/rate-limit.entity';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimiterController } from './rate-limiter.controller';
import { DbThrottlerGuard } from './guards/db-throttler.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([RateLimit]),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,         // 60 seconds
          limit: 100,      // 100 requests (global default)
        },
      ],
    }),
  ],
  providers: [
    RateLimiterService,
    {
      provide: APP_GUARD,
      useFactory: (options: any, storage: ThrottlerStorage, reflector: Reflector, service: RateLimiterService) => {
        return new DbThrottlerGuard(options, storage, reflector, service);
      },
      inject: ['THROTTLER:MODULE_OPTIONS', ThrottlerStorage, Reflector, RateLimiterService],
    },
  ],
  controllers: [RateLimiterController],
  exports: [RateLimiterService],
})
export class RateLimiterModule {}
