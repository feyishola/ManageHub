import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from '../health.controller';
import { DatabaseHealthIndicator } from '../indicators/database.indicator';
import { DiskHealthIndicator } from '../indicators/disk.indicator';
import { getDataSourceToken } from '@nestjs/typeorm';

const mockQueryRunner = {
  connect: jest.fn().mockResolvedValue(undefined),
  query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  release: jest.fn().mockResolvedValue(undefined),
};

const mockDataSource = {
  isInitialized: true,
  options: { type: 'postgres' },
  createQueryRunner: jest.fn(() => mockQueryRunner),
};

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  statfsSync: jest.fn().mockReturnValue({
    blocks: 1000000,
    bsize: 4096,
    bfree: 300000, // 70% used
  }),
}));

describe('HealthModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TerminusModule,
        ConfigModule.forRoot({ isGlobal: true }),
      ],
      controllers: [HealthController],
      providers: [
        DatabaseHealthIndicator,
        DiskHealthIndicator,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health (liveness)', () => {
    it('should return 200 with ok status', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should return Kubernetes-compatible response shape', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('should include memory checks in details', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);

      expect(response.body.details).toHaveProperty('memory_heap');
      expect(response.body.details).toHaveProperty('memory_rss');
    });
  });

  describe('GET /health/ready (readiness)', () => {
    it('should return 200 when all checks pass', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('ok');
    });

    it('should include database details', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.OK);

      expect(response.body.details).toHaveProperty('database');
      expect(response.body.details.database.status).toBe('up');
    });

    it('should include disk details', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.OK);

      expect(response.body.details).toHaveProperty('disk');
    });

    it('should return 503 when database is down', async () => {
      mockQueryRunner.query.mockRejectedValueOnce(new Error('Connection refused'));

      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /health/db (database)', () => {
    beforeEach(() => {
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.query.mockResolvedValue([{ '?column?': 1 }]);
      mockQueryRunner.release.mockResolvedValue(undefined);
    });

    it('should return 200 when database is healthy', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('ok');
    });

    it('should include database details with responseTime', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(HttpStatus.OK);

      expect(response.body.details.database).toHaveProperty('status', 'up');
      expect(response.body.details.database).toHaveProperty('responseTime');
      expect(response.body.details.database.responseTime).toMatch(/^\d+ms$/);
    });

    it('should return 503 when database is unhealthy', async () => {
      mockQueryRunner.connect.mockRejectedValueOnce(new Error('DB down'));

      const response = await request(app.getHttpServer())
        .get('/health/db')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body.status).toBe('error');
      expect(response.body.error).toHaveProperty('database');
    });

    it('should not require authentication', async () => {
      // No auth headers — should still succeed
      await request(app.getHttpServer()).get('/health/db').expect(HttpStatus.OK);
    });
  });
});
