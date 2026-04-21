import Redis from "ioredis";

type MemoryBucket = {
  count: number;
  expiresAt: number;
};

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();
let redis: Redis | null = null;
let redisAvailable = false;
let redisConnecting: Promise<void> | null = null;

export async function checkRateLimit(request: Request, options: RateLimitOptions) {
  const identity = getClientIp(request);
  const key = [
    "lm-web-rate-limit",
    options.keyPrefix,
    identity,
    request.method,
    new URL(request.url).pathname
  ].join(":");

  if (process.env.REDIS_URL) {
    const redisClient = await getRedisClient();

    if (redisClient && redisAvailable) {
      try {
        return await hitRedis(
          redisClient,
          key,
          options.limit,
          options.windowSeconds
        );
      } catch {
        redisAvailable = false;
      }
    }
  }

  return hitMemory(key, options.limit, options.windowSeconds);
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

async function getRedisClient() {
  if (redis && redisAvailable) {
    return redis;
  }

  if (redisConnecting) {
    await redisConnecting.catch(() => undefined);
    return redis;
  }

  if (redis) {
    redis.disconnect();
  }

  redis = new Redis(process.env.REDIS_URL!, {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  redis.on("error", () => {
    redisAvailable = false;
  });

  redisConnecting = redis
    .connect()
    .then(() => {
      redisAvailable = true;
    })
    .catch(() => {
      redisAvailable = false;
    })
    .finally(() => {
      redisConnecting = null;
    });

  await redisConnecting;

  return redis;
}

async function hitRedis(
  redisClient: Redis,
  key: string,
  limit: number,
  windowSeconds: number
) {
  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, windowSeconds);
  }

  const ttl = await redisClient.ttl(key);

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(limit - count, 0),
    resetSeconds: ttl > 0 ? ttl : windowSeconds
  };
}

function hitMemory(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const current = memoryBuckets.get(key);

  if (!current || current.expiresAt <= now) {
    memoryBuckets.set(key, {
      count: 1,
      expiresAt: now + windowSeconds * 1000
    });
    pruneMemory(now);

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

function pruneMemory(now: number) {
  if (memoryBuckets.size < 2000) {
    return;
  }

  for (const [key, bucket] of memoryBuckets.entries()) {
    if (bucket.expiresAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}
