import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RateLimiterController } from './rate-limiter.controller';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimit } from './entities/rate-limit.entity';
import { ApplyTo } from './enums/apply-to.enum';
import { CreateRateLimitDto } from './dto/create-rate-limit.dto';

const makeLimit = (overrides: Partial<RateLimit> = {}): RateLimit => ({
  id: 'uuid-1',
  route: '/api/users',
  method: 'GET',
  maxRequests: 100,
  windowSeconds: 60,
  applyTo: ApplyTo.ALL,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockService = () => ({
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

describe('RateLimiterController', () => {
  let controller: RateLimiterController;
  let service: jest.Mocked<RateLimiterService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RateLimiterController],
      providers: [{ provide: RateLimiterService, useFactory: mockService }],
    }).compile();

    controller = module.get(RateLimiterController);
    service = module.get(RateLimiterService) as jest.Mocked<RateLimiterService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /rate-limits', () => {
    it('returns all limits', async () => {
      const limits = [makeLimit()];
      service.findAll.mockResolvedValue(limits);
      expect(await controller.findAll()).toEqual(limits);
    });
  });

  describe('GET /rate-limits/:id', () => {
    it('returns single limit', async () => {
      const limit = makeLimit();
      service.findOne.mockResolvedValue(limit);
      expect(await controller.findOne('uuid-1')).toEqual(limit);
    });

    it('throws NotFoundException when not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /rate-limits', () => {
    const dto: CreateRateLimitDto = {
      route: '/api/posts',
      method: 'POST',
      maxRequests: 10,
      windowSeconds: 60,
      applyTo: ApplyTo.ALL,
    };

    it('creates and returns new limit', async () => {
      const created = makeLimit(dto);
      service.create.mockResolvedValue(created);
      expect(await controller.create(dto)).toEqual(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('propagates ConflictException', async () => {
      service.create.mockRejectedValue(new ConflictException());
      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('PATCH /rate-limits/:id', () => {
    it('updates and returns limit', async () => {
      const updated = makeLimit({ maxRequests: 999 });
      service.update.mockResolvedValue(updated);
      expect(await controller.update('uuid-1', { maxRequests: 999 })).toEqual(updated);
    });
  });

  describe('DELETE /rate-limits/:id', () => {
    it('removes the limit', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(controller.remove('uuid-1')).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('uuid-1');
    });
  });
});
