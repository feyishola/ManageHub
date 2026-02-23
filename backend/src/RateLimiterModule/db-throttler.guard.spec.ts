import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DbThrottlerGuard } from './guards/db-throttler.guard';
import { RateLimiterService } from './rate-limiter.service';
import { ApplyTo } from './enums/apply-to.enum';

const mockRequest = (overrides: any = {}) => ({
  path: '/api/users',
  method: 'GET',
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
  user: undefined,
  headers: {},
  ...overrides,
});

const mockResponse = () => {
  const headers: Record<string, any> = {};
  return {
    setHeader: jest.fn((key: string, value: any) => { headers[key] = value; }),
    _headers: headers,
  };
};

const mockContext = (req: any, res: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
  } as any);

describe('DbThrottlerGuard', () => {
  let guard: DbThrottlerGuard;
  let rateLimiterService: jest.Mocked<RateLimiterService>;
  let storage: any;

  const throttlerOptions = {
    throttlers: [{ ttl: 60, limit: 100 }],
  };

  beforeEach(() => {
    rateLimiterService = {
      findMatchingLimit: jest.fn(),
      getAllActiveLimits: jest.fn(),
      invalidateCache: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as any;

    storage = {
      increment: jest.fn(),
    };

    const reflector = new Reflector();
    guard = new DbThrottlerGuard(throttlerOptions as any, storage, reflector, rateLimiterService);
    // expose storageService for our override
    (guard as any).storageService = storage;
  });

  describe('DB-driven limits', () => {
    it('allows request when under DB limit', async () => {
      rateLimiterService.findMatchingLimit.mockResolvedValue({
        maxRequests: 10,
        windowSeconds: 60,
        applyTo: ApplyTo.ALL,
      });
      storage.increment.mockResolvedValue({ totalHits: 5 });

      const req = mockRequest();
      const res = mockResponse();
      const ctx = mockContext(req, res);

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 5);
    });

    it('throws 429 when DB limit exceeded and sets Retry-After header', async () => {
      rateLimiterService.findMatchingLimit.mockResolvedValue({
        maxRequests: 10,
        windowSeconds: 60,
        applyTo: ApplyTo.ALL,
      });
      storage.increment.mockResolvedValue({ totalHits: 11 });

      const req = mockRequest();
      const res = mockResponse();
      const ctx = mockContext(req, res);

      await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 60);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
    });

    it('extracts user role for DB lookup when authenticated', async () => {
      const req = mockRequest({ user: { id: 'user-1', role: 'admin' } });
      const res = mockResponse();
      const ctx = mockContext(req, res);

      rateLimiterService.findMatchingLimit.mockResolvedValue({
        maxRequests: 500,
        windowSeconds: 60,
        applyTo: ApplyTo.ROLE_ADMIN,
      });
      storage.increment.mockResolvedValue({ totalHits: 1 });

      await guard.canActivate(ctx);
      expect(rateLimiterService.findMatchingLimit).toHaveBeenCalledWith(
        '/api/users',
        'GET',
        'admin',
      );
    });

    it('passes undefined role for unauthenticated requests', async () => {
      const req = mockRequest({ user: undefined });
      const res = mockResponse();
      const ctx = mockContext(req, res);

      rateLimiterService.findMatchingLimit.mockResolvedValue(null);

      // fallthrough to super — mock super.canActivate
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      await guard.canActivate(ctx);
      expect(rateLimiterService.findMatchingLimit).toHaveBeenCalledWith(
        '/api/users',
        'GET',
        undefined,
      );
    });
  });

  describe('fallthrough to default throttle', () => {
    it('falls through to super.canActivate when no DB limit matches', async () => {
      rateLimiterService.findMatchingLimit.mockResolvedValue(null);

      const superCanActivate = jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
        .mockResolvedValue(true);

      const req = mockRequest();
      const res = mockResponse();
      await guard.canActivate(mockContext(req, res));

      expect(superCanActivate).toHaveBeenCalled();
    });
  });

  describe('throwThrottlingException', () => {
    it('sets Retry-After header before throwing', async () => {
      const res = mockResponse();
      const ctx = mockContext(mockRequest(), res);

      jest
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'throwThrottlingException')
        .mockResolvedValue(undefined);

      await guard.throwThrottlingException(ctx, { timeToExpire: 30000 });
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 30);
    });
  });
});
