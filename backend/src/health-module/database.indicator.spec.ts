import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DatabaseHealthIndicator } from '../database.indicator';

const mockQueryRunner = {
  connect: jest.fn(),
  query: jest.fn(),
  release: jest.fn(),
};

const mockDataSource = {
  isInitialized: true,
  options: { type: 'postgres' },
  createQueryRunner: jest.fn(() => mockQueryRunner),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: number) => {
    const config: Record<string, number> = {
      HEALTH_CHECK_TIMEOUT_MS: 3000,
    };
    return config[key] ?? defaultValue;
  }),
};

describe('DatabaseHealthIndicator', () => {
  let indicator: DatabaseHealthIndicator;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseHealthIndicator,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    indicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);
  });

  describe('isHealthy', () => {
    it('should return healthy status when database is reachable', async () => {
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.query.mockResolvedValue([{ '?column?': 1 }]);
      mockQueryRunner.release.mockResolvedValue(undefined);

      const result = await indicator.isHealthy('database');

      expect(result).toMatchObject({
        database: {
          status: 'up',
          connected: true,
          database: 'postgres',
        },
      });
      expect(result.database.responseTime).toMatch(/^\d+ms$/);
    });

    it('should include responseTime in result', async () => {
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.query.mockResolvedValue([]);
      mockQueryRunner.release.mockResolvedValue(undefined);

      const result = await indicator.isHealthy('database');

      expect(result.database).toHaveProperty('responseTime');
      expect(result.database.responseTime).toMatch(/^\d+ms$/);
    });

    it('should throw HealthCheckError when datasource is not initialized', async () => {
      mockDataSource.isInitialized = false;

      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);

      mockDataSource.isInitialized = true;
    });

    it('should throw HealthCheckError when query fails', async () => {
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.query.mockRejectedValue(new Error('Connection refused'));
      mockQueryRunner.release.mockResolvedValue(undefined);

      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
    });

    it('should release queryRunner even when query fails', async () => {
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.query.mockRejectedValue(new Error('Query error'));
      mockQueryRunner.release.mockResolvedValue(undefined);

      await expect(indicator.isHealthy('database')).rejects.toThrow();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw HealthCheckError when query times out', async () => {
      // Set very short timeout
      mockConfigService.get.mockImplementation((key: string, defaultValue?: number) => {
        if (key === 'HEALTH_CHECK_TIMEOUT_MS') return 10;
        return defaultValue;
      });

      // Rebuild module with short timeout
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseHealthIndicator,
          { provide: getDataSourceToken(), useValue: mockDataSource },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const shortTimeoutIndicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);

      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.query.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
      );
      mockQueryRunner.release.mockResolvedValue(undefined);

      await expect(shortTimeoutIndicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
    }, 10000);

    it('should include error message in failed result', async () => {
      const errorMessage = 'ECONNREFUSED 127.0.0.1:5432';
      mockQueryRunner.connect.mockRejectedValue(new Error(errorMessage));
      mockQueryRunner.release.mockResolvedValue(undefined);

      try {
        await indicator.isHealthy('database');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect(JSON.stringify(error.causes)).toContain('down');
      }
    });

    it('should use custom key in result', async () => {
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.query.mockResolvedValue([]);
      mockQueryRunner.release.mockResolvedValue(undefined);

      const result = await indicator.isHealthy('custom_db_key');

      expect(result).toHaveProperty('custom_db_key');
    });
  });
});
