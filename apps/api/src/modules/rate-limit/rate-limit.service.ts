import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

type MemoryBucket = {
  count: number;
  expiresAt: number;
};

@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly memoryBuckets = new Map<string, MemoryBucket>();
  private redis: Redis | null = null;
  private redisAvailable = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>("REDIS_URL");

    if (!redisUrl) {
      this.logger.warn("REDIS_URL missing; rate limiting will use in-memory fallback");
      return;
    }

    this.redis = new Redis(redisUrl, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });

    this.redis.on("error", () => {
      this.redisAvailable = false;
    });

    try {
      await this.redis.connect();
      this.redisAvailable = true;
    } catch {
      this.redisAvailable = false;
      this.logger.warn("Redis unavailable; rate limiting will use in-memory fallback");
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
    }
  }

  async hit(key: string, limit: number, windowSeconds: number) {
    if (this.redis && this.redisAvailable) {
      try {
        return await this.hitRedis(key, limit, windowSeconds);
      } catch {
        this.redisAvailable = false;
      }
    }

    return this.hitMemory(key, limit, windowSeconds);
  }

  private async hitRedis(key: string, limit: number, windowSeconds: number) {
    const count = await this.redis!.incr(key);

    if (count === 1) {
      await this.redis!.expire(key, windowSeconds);
    }

    const ttl = await this.redis!.ttl(key);

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(limit - count, 0),
      resetSeconds: ttl > 0 ? ttl : windowSeconds
    };
  }

  private hitMemory(key: string, limit: number, windowSeconds: number) {
    const now = Date.now();
    const current = this.memoryBuckets.get(key);

    if (!current || current.expiresAt <= now) {
      const bucket = {
        count: 1,
        expiresAt: now + windowSeconds * 1000
      };
      this.memoryBuckets.set(key, bucket);
      this.pruneMemory(now);

      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetSeconds: windowSeconds
      };
    }

    current.count += 1;

    return {
      allowed: current.count <= limit,
      limit,
      remaining: Math.max(limit - current.count, 0),
      resetSeconds: Math.ceil((current.expiresAt - now) / 1000)
    };
  }

  private pruneMemory(now: number) {
    if (this.memoryBuckets.size < 5000) {
      return;
    }

    for (const [key, bucket] of this.memoryBuckets.entries()) {
      if (bucket.expiresAt <= now) {
        this.memoryBuckets.delete(key);
      }
    }
  }
}
