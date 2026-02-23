import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as fs from 'fs';

export interface DiskUsageInfo {
  total: number;
  used: number;
  free: number;
  usagePercentage: number;
  path: string;
}

@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DiskHealthIndicator.name);
  private readonly thresholdPercent: number;
  private readonly checkPath: string;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    super();
    this.thresholdPercent = this.configService.get<number>('HEALTH_DISK_THRESHOLD_PERCENT', 90);
    this.checkPath = this.configService.get<string>('HEALTH_DISK_CHECK_PATH', '/');
    this.timeout = this.configService.get<number>('HEALTH_CHECK_TIMEOUT_MS', 3000);
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      const diskInfo = await this.runWithTimeout(
        this.getDiskUsage(this.checkPath),
        this.timeout,
        'Disk health check timed out',
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = diskInfo.usagePercentage < this.thresholdPercent;

      if (!isHealthy) {
        const result = this.getStatus(key, false, {
          status: 'down',
          responseTime: `${responseTime}ms`,
          message: `Disk usage ${diskInfo.usagePercentage.toFixed(1)}% exceeds threshold ${this.thresholdPercent}%`,
          ...this.formatDiskInfo(diskInfo),
        });
        throw new HealthCheckError('Disk health check failed', result);
      }

      return this.getStatus(key, true, {
        status: 'up',
        responseTime: `${responseTime}ms`,
        threshold: `${this.thresholdPercent}%`,
        ...this.formatDiskInfo(diskInfo),
      });
    } catch (error) {
      if (error instanceof HealthCheckError) throw error;

      const responseTime = Date.now() - startTime;
      this.logger.error(`Disk health check failed: ${error.message}`, error.stack);

      const result = this.getStatus(key, false, {
        status: 'down',
        responseTime: `${responseTime}ms`,
        message: error.message,
      });

      throw new HealthCheckError('Disk health check failed', result);
    }
  }

  private formatDiskInfo(info: DiskUsageInfo) {
    return {
      path: info.path,
      total: this.formatBytes(info.total),
      used: this.formatBytes(info.used),
      free: this.formatBytes(info.free),
      usagePercentage: `${info.usagePercentage.toFixed(1)}%`,
    };
  }

  private async getDiskUsage(checkPath: string): Promise<DiskUsageInfo> {
    // Check path exists
    if (!fs.existsSync(checkPath)) {
      throw new Error(`Check path does not exist: ${checkPath}`);
    }

    // Use os.freemem/totalmem as fallback for cross-platform compatibility
    // In production, prefer statvfs or df command for accurate disk info
    try {
      const stats = fs.statfsSync(checkPath);
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      const usagePercentage = (used / total) * 100;

      return { total, used, free, usagePercentage, path: checkPath };
    } catch {
      // Fallback to memory stats on systems without statfs
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      const usagePercentage = (used / total) * 100;

      return { total, used, free, usagePercentage, path: 'memory' };
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
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
