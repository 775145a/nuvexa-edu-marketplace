import { config } from '../config';
import { logger } from './logger';

const mem = new Map<string, { value: unknown; exp: number }>();

let redisPromise: Promise<any | null> | null = null;

async function getRedis(): Promise<any | null> {
  if (config.cache.provider !== 'redis') return null;
  if (!redisPromise) {
    redisPromise = (async () => {
      try {
        const { default: Redis } = await import('ioredis');
        const client = new Redis(config.redis.url, {
          lazyConnect: true,
          maxRetriesPerRequest: null,
        });
        client.on('error', (err: Error) => logger.warn(`Redis error: ${err.message}`));
        await client.connect();
        return client;
      } catch (err) {
        logger.warn(`Redis unavailable, falling back to memory cache: ${err instanceof Error ? err.message : err}`);
        return null;
      }
    })();
  }
  const client = await redisPromise;
  if (!client) return null;
  return client;
}

export const cache = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const client = await getRedis();
    if (client) {
      try {
        const raw = await client.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    }
    const hit = mem.get(key);
    if (!hit) return null;
    if (hit.exp < Date.now()) {
      mem.delete(key);
      return null;
    }
    return hit.value as T;
  },

  async set(key: string, value: unknown, ttlSeconds = config.cache.ttl): Promise<void> {
    const client = await getRedis();
    if (client) {
      try {
        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch { /* ignore */ }
    }
    mem.set(key, { value, exp: Date.now() + ttlSeconds * 1000 });
  },

  async del(key: string): Promise<void> {
    const client = await getRedis();
    if (client) {
      try {
        await client.del(key);
        return;
      } catch { /* ignore */ }
    }
    mem.delete(key);
  },

  async delByPrefix(prefix: string): Promise<void> {
    const client = await getRedis();
    if (client) {
      try {
        const keys = await client.keys(`${prefix}*`);
        if (keys && keys.length) await client.del(...keys);
        return;
      } catch { /* ignore */ }
    }
    for (const key of [...mem.keys()]) {
      if (key.startsWith(prefix)) mem.delete(key);
    }
  },
};
