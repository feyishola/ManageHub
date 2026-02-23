import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimit } from './entities/rate-limit.entity';
import { ApplyTo } from './enums/apply-to.enum';
import { CreateRateLimitDto } from './dto/create-rate-limit.dto';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const makeLimit = (overrides: Partial<RateLimit> = {}): RateLimit => ({
  id: 'uuid-1',
  route: '/api/users',
  method: 'GET',
  maxRequests: 50,
  windowSeconds: 30,
  applyTo: ApplyTo.ALL,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let repo: jest.Mocked<Repository<RateLimit>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        { provide: getRepositoryToken(RateLimit), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(RateLimiterService);
    repo = module.get(getRepositoryToken(RateLimit));
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Cache ────────────────────────────────────────────────────────────────

  describe('cache', () => {
    it('fetches from DB on first call and caches result', async () => {
      const limits = [makeLimit()];
      repo.find.mockResolvedValue(limits);

      const r1 = await service.getAllActiveLimits();
      const r2 = await service.getAllActiveLimits();

      expect(repo.find).toHaveBeenCalledTimes(1);
      expect(r1).toEqual(limits);
      expect(r2).toEqual(limits);
    });

    it('re-fetches after invalidateCache()', async () => {
      const limits = [makeLimit()];
      repo.find.mockResolvedValue(limits);

      await service.getAllActiveLimits();
      service.invalidateCache();
      await service.getAllActiveLimits();

      expect(repo.find).toHaveBeenCalledTimes(2);
    });
  });

  // ─── findMatchingLimit ────────────────────────────────────────────────────

  describe('findMatchingLimit', () => {
    it('returns null when no limits defined', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.findMatchingLimit('/api/users', 'GET');
      expect(result).toBeNull();
    });

    it('returns matching limit for exact route and method', async () => {
      const limit = makeLimit({ route: '/api/users', method: 'GET', maxRequests: 50, windowSeconds: 30 });
      repo.find.mockResolvedValue([limit]);

      const result = await service.findMatchingLimit('/api/users', 'GET');
      expect(result).toEqual({ maxRequests: 50, windowSeconds: 30, applyTo: ApplyTo.ALL });
    });

    it('matches parameterized routes (:id pattern)', async () => {
      const limit = makeLimit({ route: '/api/users/:id', method: 'GET' });
      repo.find.mockResolvedValue([limit]);

      const result = await service.findMatchingLimit('/api/users/abc123', 'GET');
      expect(result).not.toBeNull();
    });

    it('does not match wrong method', async () => {
      const limit = makeLimit({ route: '/api/users', method: 'POST' });
      repo.find.mockResolvedValue([limit]);

      const result = await service.findMatchingLimit('/api/users', 'GET');
      expect(result).toBeNull();
    });

    it('wildcard method (*) matches any HTTP method', async () => {
      const limit = makeLimit({ route: '/api/users', method: '*' });
      repo.find.mockResolvedValue([limit]);

      const result = await service.findMatchingLimit('/api/users', 'DELETE');
      expect(result).not.toBeNull();
    });

    it('role-specific limit takes priority over ALL', async () => {
      const allLimit = makeLimit({ maxRequests: 100, applyTo: ApplyTo.ALL });
      const adminLimit = makeLimit({ maxRequests: 500, applyTo: ApplyTo.ROLE_ADMIN });
      repo.find.mockResolvedValue([allLimit, adminLimit]);

      const result = await service.findMatchingLimit('/api/users', 'GET', 'admin');
      expect(result!.maxRequests).toBe(500);
    });

    it('unauthenticated limit applies when no role', async () => {
      const allLimit = makeLimit({ maxRequests: 100, applyTo: ApplyTo.ALL });
      const unauthLimit = makeLimit({ maxRequests: 10, applyTo: ApplyTo.UNAUTHENTICATED });
      repo.find.mockResolvedValue([allLimit, unauthLimit]);

      const result = await service.findMatchingLimit('/api/users', 'GET', undefined);
      expect(result!.maxRequests).toBe(10);
    });
  });

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all limits from DB', async () => {
      const limits = [makeLimit(), makeLimit({ id: 'uuid-2' })];
      repo.find.mockResolvedValue(limits);
      expect(await service.findAll()).toEqual(limits);
    });
  });

  describe('findOne', () => {
    it('returns the limit when found', async () => {
      const limit = makeLimit();
      repo.findOne.mockResolvedValue(limit);
      expect(await service.findOne('uuid-1')).toEqual(limit);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto: CreateRateLimitDto = {
      route: '/api/posts',
      method: 'GET',
      maxRequests: 20,
      windowSeconds: 60,
      applyTo: ApplyTo.ALL,
    };

    it('creates and returns the new limit', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(makeLimit(dto));
      repo.save.mockResolvedValue(makeLimit(dto));

      const result = await service.create(dto);
      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalled();
      expect(result.route).toBe(dto.route);
    });

    it('throws ConflictException if duplicate exists', async () => {
      repo.findOne.mockResolvedValue(makeLimit());
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('invalidates cache after create', async () => {
      repo.find.mockResolvedValue([makeLimit()]);
      await service.getAllActiveLimits(); // prime cache

      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(makeLimit(dto));
      repo.save.mockResolvedValue(makeLimit(dto));
      await service.create(dto);

      // cache should be invalidated — next getAllActiveLimits must re-fetch
      repo.find.mockResolvedValue([makeLimit(), makeLimit(dto)]);
      await service.getAllActiveLimits();
      expect(repo.find).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    it('updates and returns the limit', async () => {
      const existing = makeLimit();
      repo.findOne.mockResolvedValueOnce(existing); // findOne by id
      repo.findOne.mockResolvedValueOnce(null);      // conflict check
      const updated = { ...existing, maxRequests: 200 };
      repo.save.mockResolvedValue(updated as RateLimit);

      const result = await service.update('uuid-1', { maxRequests: 200 });
      expect(result.maxRequests).toBe(200);
    });

    it('throws NotFoundException when id not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update('bad-id', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate route/method/applyTo', async () => {
      const existing = makeLimit();
      const conflicting = makeLimit({ id: 'uuid-2' });
      repo.findOne.mockResolvedValueOnce(existing);
      repo.findOne.mockResolvedValueOnce(conflicting);

      await expect(
        service.update('uuid-1', { route: '/api/users', method: 'GET', applyTo: ApplyTo.ALL }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('removes the limit and invalidates cache', async () => {
      const limit = makeLimit();
      repo.findOne.mockResolvedValue(limit);
      repo.remove.mockResolvedValue(limit);

      await service.remove('uuid-1');
      expect(repo.remove).toHaveBeenCalledWith(limit);
    });

    it('throws NotFoundException when id not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
