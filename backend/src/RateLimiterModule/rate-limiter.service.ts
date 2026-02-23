import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateLimit } from './entities/rate-limit.entity';
import { CreateRateLimitDto, UpdateRateLimitDto } from './dto/create-rate-limit.dto';
import { ApplyTo } from './enums/apply-to.enum';

export interface CachedRateLimit {
  maxRequests: number;
  windowSeconds: number;
  applyTo: ApplyTo;
}

interface CacheEntry {
  limits: RateLimit[];
  expiresAt: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private cache: CacheEntry | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(RateLimit)
    private readonly rateLimitRepo: Repository<RateLimit>,
  ) {}

  // ─── Cache Management ───────────────────────────────────────────────────────

  private isCacheValid(): boolean {
    return this.cache !== null && Date.now() < this.cache.expiresAt;
  }

  private setCacheEntry(limits: RateLimit[]): void {
    this.cache = {
      limits,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };
  }

  invalidateCache(): void {
    this.cache = null;
    this.logger.debug('Rate limit cache invalidated');
  }

  async getAllActiveLimits(): Promise<RateLimit[]> {
    if (this.isCacheValid()) {
      return this.cache!.limits;
    }

    const limits = await this.rateLimitRepo.find({
      where: { isActive: true },
    });

    this.setCacheEntry(limits);
    this.logger.debug(`Loaded ${limits.length} active rate limits into cache`);
    return limits;
  }

  /**
   * Finds the most specific matching rate limit for a given route, method, and role.
   * Priority: role-specific > unauthenticated > all
   */
  async findMatchingLimit(
    route: string,
    method: string,
    userRole?: string,
  ): Promise<CachedRateLimit | null> {
    const allLimits = await this.getAllActiveLimits();

    const matching = allLimits.filter((limit) => {
      if (limit.method !== '*' && limit.method.toUpperCase() !== method.toUpperCase()) {
        return false;
      }
      return this.routeMatches(limit.route, route);
    });

    if (!matching.length) return null;

    // Priority scoring: role-specific (3) > unauthenticated (2) > all (1)
    const scored = matching.map((limit) => {
      let score = 1;
      if (limit.applyTo === ApplyTo.UNAUTHENTICATED && !userRole) score = 2;
      if (userRole && limit.applyTo === `role:${userRole}`) score = 3;
      return { limit, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].limit;

    return {
      maxRequests: best.maxRequests,
      windowSeconds: best.windowSeconds,
      applyTo: best.applyTo,
    };
  }

  private routeMatches(pattern: string, route: string): boolean {
    // Convert route pattern to regex: /api/users/:id -> /api/users/[^/]+
    const regexStr = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars except already-escaped
      .replace(/\\:\w+/g, '[^/]+') // :param -> [^/]+
      .replace(/\\\*/g, '.*'); // * -> .*
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(route);
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(): Promise<RateLimit[]> {
    return this.rateLimitRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<RateLimit> {
    const limit = await this.rateLimitRepo.findOne({ where: { id } });
    if (!limit) throw new NotFoundException(`Rate limit with id "${id}" not found`);
    return limit;
  }

  async create(dto: CreateRateLimitDto): Promise<RateLimit> {
    const existing = await this.rateLimitRepo.findOne({
      where: {
        route: dto.route,
        method: dto.method,
        applyTo: dto.applyTo ?? ApplyTo.ALL,
      },
    });

    if (existing) {
      throw new ConflictException(
        `A rate limit for route "${dto.route}" [${dto.method}] with applyTo "${dto.applyTo ?? ApplyTo.ALL}" already exists`,
      );
    }

    const entity = this.rateLimitRepo.create(dto);
    const saved = await this.rateLimitRepo.save(entity);
    this.invalidateCache();
    return saved;
  }

  async update(id: string, dto: UpdateRateLimitDto): Promise<RateLimit> {
    const limit = await this.findOne(id);

    if (dto.route || dto.method || dto.applyTo) {
      const route = dto.route ?? limit.route;
      const method = dto.method ?? limit.method;
      const applyTo = dto.applyTo ?? limit.applyTo;

      const conflict = await this.rateLimitRepo.findOne({
        where: { route, method, applyTo },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Another rate limit for route "${route}" [${method}] with applyTo "${applyTo}" already exists`,
        );
      }
    }

    Object.assign(limit, dto);
    const saved = await this.rateLimitRepo.save(limit);
    this.invalidateCache();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const limit = await this.findOne(id);
    await this.rateLimitRepo.remove(limit);
    this.invalidateCache();
  }
}
