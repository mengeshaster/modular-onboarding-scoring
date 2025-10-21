import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../logger';
import { RecentSessionSummary } from '../validation/onboarding.schema';

export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redis.on('error', (err: Error) => {
      logger.error('Redis error:', err);
    });
  }

  private getRecentSessionsKey(userId: string): string {
    return `onboarding:recent:${userId}`;
  }

  async addRecentSession(userId: string, sessionSummary: RecentSessionSummary): Promise<void> {
    const key = this.getRecentSessionsKey(userId);
    const summaryJson = JSON.stringify(sessionSummary);

    try {
      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Add new session to the beginning of the list
      pipeline.lpush(key, summaryJson);
      
      // Keep only the most recent 10 sessions
      pipeline.ltrim(key, 0, config.cache.recentSessionsLimit - 1);
      
      // Set TTL to 24 hours
      pipeline.expire(key, config.cache.recentSessionsTtl);
      
      await pipeline.exec();
      
      logger.debug('Added recent session to cache', { userId, sessionId: sessionSummary.id });
    } catch (error) {
      logger.error('Failed to add recent session to cache:', error);
      // Don't throw - cache failures shouldn't break the main flow
    }
  }

  async getRecentSessions(userId: string): Promise<RecentSessionSummary[]> {
    const key = this.getRecentSessionsKey(userId);

    try {
      const sessions = await this.redis.lrange(key, 0, -1);
      return sessions.map((session: string) => JSON.parse(session));
    } catch (error) {
      logger.error('Failed to get recent sessions from cache:', error);
      return [];
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

export const redisService = new RedisService();