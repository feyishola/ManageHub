import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { HealthController } from '../health.controller';
import { DatabaseHealthIndicator } from '../indicators/database.indicator';
import { DiskHealthIndicator } from '../indicators/disk.indicator';

const mockHealthResult = {
  status: 'ok',
  info: {},
  error: {},
  details: {},
};

const mockHealthCheckService = {
  check: jest.fn().mockResolvedValue(mockHealthResult),
};

const mockTypeOrmIndicator = {
  pingCheck: jest.fn(),
};

const mockMemoryIndicator = {
  checkHeap: jest.fn(),
  checkRSS: jest.fn(),
};

const mockDatabaseIndicator = {
  isHealthy: jest.fn(),
};

const mockDiskIndicator = {
  isHealthy: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      HEALTH_MEMORY_HEAP_THRESHOLD_BYTES: 512 * 1024 * 1024,
      HEALTH_MEMORY_RSS_THRESHOLD_BYTES: 1024 * 1024 * 1024,
    };
    return config[key] ?? defaultValue;
  }),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: mockTypeOrmIndicator },
        { provide: MemoryHealthIndicator, useValue: mockMemoryIndicator },
        { provide: DatabaseHealthIndicator, useValue: mockDatabaseIndicator },
        { provide: DiskHealthIndicator, useValue: mockDiskIndicator },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('liveness (GET /health)', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should call health.check with memory checks', async () => {
      const result = await controller.liveness();

      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith(expect.any(Array));
      expect(result).toEqual(mockHealthResult);
    });

    it('should include heap and RSS memory checks', async () => {
      let capturedChecks: Function[] = [];
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        capturedChecks = checks;
        return mockHealthResult;
      });

      await controller.liveness();

      expect(capturedChecks).toHaveLength(2);
    });

    it('should return health result', async () => {
      const result = await controller.liveness();

      expect(result).toEqual(mockHealthResult);
    });
  });

  describe('readiness (GET /health/ready)', () => {
    it('should call health.check with db, disk, and memory checks', async () => {
      let capturedChecks: Function[] = [];
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        capturedChecks = checks;
        return mockHealthResult;
      });

      const result = await controller.readiness();

      expect(result).toEqual(mockHealthResult);
      expect(capturedChecks).toHaveLength(3);
    });

    it('should invoke database indicator', async () => {
      mockDatabaseIndicator.isHealthy.mockReturnValue(Promise.resolve({ database: { status: 'up' } }));
      mockDiskIndicator.isHealthy.mockReturnValue(Promise.resolve({ disk: { status: 'up' } }));
      mockMemoryIndicator.checkHeap.mockReturnValue(Promise.resolve({ memory_heap: { status: 'up' } }));

      mockHealthCheckService.check.mockImplementation(async (checks) => {
        await Promise.all(checks.map((fn: Function) => fn()));
        return mockHealthResult;
      });

      await controller.readiness();

      expect(mockDatabaseIndicator.isHealthy).toHaveBeenCalledWith('database');
    });

    it('should invoke disk indicator', async () => {
      mockDatabaseIndicator.isHealthy.mockReturnValue(Promise.resolve({}));
      mockDiskIndicator.isHealthy.mockReturnValue(Promise.resolve({}));
      mockMemoryIndicator.checkHeap.mockReturnValue(Promise.resolve({}));

      mockHealthCheckService.check.mockImplementation(async (checks) => {
        await Promise.all(checks.map((fn: Function) => fn()));
        return mockHealthResult;
      });

      await controller.readiness();

      expect(mockDiskIndicator.isHealthy).toHaveBeenCalledWith('disk');
    });
  });

  describe('database (GET /health/db)', () => {
    it('should call health.check with only database check', async () => {
      let capturedChecks: Function[] = [];
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        capturedChecks = checks;
        return mockHealthResult;
      });

      const result = await controller.database();

      expect(result).toEqual(mockHealthResult);
      expect(capturedChecks).toHaveLength(1);
    });

    it('should invoke database indicator with correct key', async () => {
      mockDatabaseIndicator.isHealthy.mockReturnValue(Promise.resolve({ database: { status: 'up' } }));

      mockHealthCheckService.check.mockImplementation(async (checks) => {
        await Promise.all(checks.map((fn: Function) => fn()));
        return mockHealthResult;
      });

      await controller.database();

      expect(mockDatabaseIndicator.isHealthy).toHaveBeenCalledWith('database');
    });
  });
});
