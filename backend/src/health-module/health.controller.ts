import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';
import { DatabaseHealthIndicator } from './indicators/database.indicator';
import { DiskHealthIndicator } from './indicators/disk.indicator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly memoryHeapThreshold: number;
  private readonly memoryRssThreshold: number;

  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrmIndicator: TypeOrmHealthIndicator,
    private readonly memoryIndicator: MemoryHealthIndicator,
    private readonly databaseIndicator: DatabaseHealthIndicator,
    private readonly diskIndicator: DiskHealthIndicator,
    private readonly configService: ConfigService,
  ) {
    // Default: 512MB heap, 1GB RSS
    this.memoryHeapThreshold = this.configService.get<number>(
      'HEALTH_MEMORY_HEAP_THRESHOLD_BYTES',
      512 * 1024 * 1024,
    );
    this.memoryRssThreshold = this.configService.get<number>(
      'HEALTH_MEMORY_RSS_THRESHOLD_BYTES',
      1024 * 1024 * 1024,
    );
  }

  /**
   * Liveness probe — is the application process alive?
   * Kubernetes: livenessProbe
   */
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Returns 200 OK if the application process is running. Used for Kubernetes livenessProbe.',
  })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  @ApiResponse({ status: 503, description: 'Application is unhealthy' })
  async liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memoryIndicator.checkHeap('memory_heap', this.memoryHeapThreshold),
      () => this.memoryIndicator.checkRSS('memory_rss', this.memoryRssThreshold),
    ]);
  }

  /**
   * Readiness probe — is the application ready to serve traffic?
   * Kubernetes: readinessProbe
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Returns 200 OK if the application is ready to handle requests. Checks DB, memory, and disk. Used for Kubernetes readinessProbe.',
  })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.databaseIndicator.isHealthy('database'),
      () => this.diskIndicator.isHealthy('disk'),
      () => this.memoryIndicator.checkHeap('memory_heap', this.memoryHeapThreshold),
    ]);
  }

  /**
   * Database-only health check
   */
  @Get('db')
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Database connectivity check',
    description: 'Checks TypeORM database connection health.',
  })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  async database(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.databaseIndicator.isHealthy('database'),
    ]);
  }
}
