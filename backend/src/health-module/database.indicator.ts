import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);
  private readonly timeout: number;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    super();
    this.timeout = this.configService.get<number>('HEALTH_CHECK_TIMEOUT_MS', 3000);
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      await this.runWithTimeout(
        this.checkDatabase(),
        this.timeout,
        'Database health check timed out',
      );

      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        status: 'up',
        responseTime: `${responseTime}ms`,
        database: this.dataSource.options.type,
        connected: this.dataSource.isInitialized,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Database health check failed: ${error.message}`, error.stack);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime: `${responseTime}ms`,
        message: error.message,
      });

      throw new HealthCheckError('Database health check failed', result);
    }
  }

  private async checkDatabase(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new Error('DataSource is not initialized');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.query('SELECT 1');
    } finally {
      await queryRunner.release();
    }
  }

  private runWithTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      promise
        .then((val) => {
          clearTimeout(timer);
          resolve(val);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
