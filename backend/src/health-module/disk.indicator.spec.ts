import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { DiskHealthIndicator } from '../disk.indicator';
import * as fs from 'fs';
import * as os from 'os';

jest.mock('fs');
jest.mock('os');

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      HEALTH_DISK_THRESHOLD_PERCENT: 90,
      HEALTH_DISK_CHECK_PATH: '/',
      HEALTH_CHECK_TIMEOUT_MS: 3000,
    };
    return config[key] ?? defaultValue;
  }),
};

describe('DiskHealthIndicator', () => {
  let indicator: DiskHealthIndicator;

  const mockStatfs = {
    blocks: 1000000,
    bsize: 4096,
    bfree: 200000, // 20% free → 80% used — healthy
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statfsSync as jest.Mock).mockReturnValue(mockStatfs);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiskHealthIndicator,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    indicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);
  });

  describe('isHealthy', () => {
    it('should return healthy when disk usage is below threshold', async () => {
      const result = await indicator.isHealthy('disk');

      expect(result).toMatchObject({
        disk: {
          status: 'up',
          path: '/',
        },
      });
      expect(result.disk.responseTime).toMatch(/^\d+ms$/);
      expect(result.disk.usagePercentage).toMatch(/^\d+\.\d+%$/);
    });

    it('should throw HealthCheckError when disk usage exceeds threshold', async () => {
      // 5% free → 95% used — exceeds 90% threshold
      (fs.statfsSync as jest.Mock).mockReturnValue({
        blocks: 1000000,
        bsize: 4096,
        bfree: 50000,
      });

      await expect(indicator.isHealthy('disk')).rejects.toThrow(HealthCheckError);
    });

    it('should include disk usage details in result', async () => {
      const result = await indicator.isHealthy('disk');

      expect(result.disk).toHaveProperty('total');
      expect(result.disk).toHaveProperty('used');
      expect(result.disk).toHaveProperty('free');
      expect(result.disk).toHaveProperty('usagePercentage');
      expect(result.disk).toHaveProperty('threshold');
    });

    it('should throw HealthCheckError when path does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(indicator.isHealthy('disk')).rejects.toThrow(HealthCheckError);
    });

    it('should fall back to memory stats when statfs fails', async () => {
      (fs.statfsSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOSYS');
      });

      (os.totalmem as jest.Mock).mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
      (os.freemem as jest.Mock).mockReturnValue(4 * 1024 * 1024 * 1024); // 4GB free = 50% used

      const result = await indicator.isHealthy('disk');

      expect(result.disk.status).toBe('up');
      expect(result.disk.path).toBe('memory');
    });

    it('should use custom key', async () => {
      const result = await indicator.isHealthy('storage');

      expect(result).toHaveProperty('storage');
    });

    it('should include responseTime in all responses', async () => {
      const result = await indicator.isHealthy('disk');

      expect(result.disk.responseTime).toMatch(/^\d+ms$/);
    });

    it('should respect configured threshold', async () => {
      // Custom threshold: 95%
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'HEALTH_DISK_THRESHOLD_PERCENT') return 95;
        if (key === 'HEALTH_DISK_CHECK_PATH') return '/';
        if (key === 'HEALTH_CHECK_TIMEOUT_MS') return 3000;
        return defaultValue;
      });

      const module = await Test.createTestingModule({
        providers: [
          DiskHealthIndicator,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const highThresholdIndicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);

      // 80% used — still under 95% threshold
      const result = await highThresholdIndicator.isHealthy('disk');
      expect(result.disk.status).toBe('up');
    });
  });
});
