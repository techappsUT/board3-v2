import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis!: Redis;
  private subscriber!: Redis;
  private publisher!: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisConfig = {
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
    };

    try {
      // Main Redis client
      this.redis = new Redis(redisConfig);

      // Separate clients for pub/sub to avoid blocking
      this.subscriber = new Redis({ ...redisConfig, lazyConnect: false });
      this.publisher = new Redis({ ...redisConfig, lazyConnect: false });

      await this.redis.connect();

      // Set up event listeners
      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redis.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      // Test connection
      await this.redis.ping();
      this.logger.log('Redis connection established successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await Promise.all([this.redis?.quit(), this.subscriber?.quit(), this.publisher?.quit()]);
      this.logger.log('Redis connections closed');
    } catch (error) {
      this.logger.error('Error closing Redis connections:', error);
    }
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * Get subscriber client for pub/sub
   */
  getSubscriber(): Redis {
    return this.subscriber;
  }

  /**
   * Get publisher client for pub/sub
   */
  getPublisher(): Redis {
    return this.publisher;
  }

  /**
   * Cache data with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set TTL for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Store session data
   */
  async setSession(sessionId: string, sessionData: any, ttl: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, sessionData, ttl);
  }

  /**
   * Get session data
   */
  async getSession<T>(sessionId: string): Promise<T | null> {
    const key = `session:${sessionId}`;
    return await this.get<T>(key);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  /**
   * Cache user data
   */
  async cacheUser(userId: string, userData: any, ttl: number = 1800): Promise<void> {
    const key = `user:${userId}`;
    await this.set(key, userData, ttl);
  }

  /**
   * Get cached user data
   */
  async getCachedUser<T>(userId: string): Promise<T | null> {
    const key = `user:${userId}`;
    return await this.get<T>(key);
  }

  /**
   * Cache design data
   */
  async cacheDesign(designId: string, designData: any, ttl: number = 600): Promise<void> {
    const key = `design:${designId}`;
    await this.set(key, designData, ttl);
  }

  /**
   * Get cached design data
   */
  async getCachedDesign<T>(designId: string): Promise<T | null> {
    const key = `design:${designId}`;
    return await this.get<T>(key);
  }

  /**
   * Cache template data
   */
  async cacheTemplate(templateId: string, templateData: any, ttl: number = 1200): Promise<void> {
    const key = `template:${templateId}`;
    await this.set(key, templateData, ttl);
  }

  /**
   * Get cached template data
   */
  async getCachedTemplate<T>(templateId: string): Promise<T | null> {
    const key = `template:${templateId}`;
    return await this.get<T>(key);
  }

  /**
   * Add to rate limit counter
   */
  async incrementRateLimit(key: string, ttl: number = 3600): Promise<number> {
    try {
      const multi = this.redis.multi();
      multi.incr(key);
      multi.expire(key, ttl);
      const results = await multi.exec();
      return (results?.[0]?.[1] as number) || 0;
    } catch (error) {
      this.logger.error(`Failed to increment rate limit for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get rate limit count
   */
  async getRateLimitCount(key: string): Promise<number> {
    try {
      const count = await this.redis.get(key);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      this.logger.error(`Failed to get rate limit count for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: any): Promise<void> {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (parseError) {
            this.logger.error(`Failed to parse message from channel ${channel}:`, parseError);
          }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Health check for Redis
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.redis.ping();
      return response === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get Redis info
   */
  async getInfo(): Promise<Record<string, string>> {
    try {
      const info = await this.redis.info();
      const lines = info.split('\r\n');
      const result: Record<string, string> = {};

      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            result[key] = value;
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get Redis info:', error);
      return {};
    }
  }

  /**
   * Clear all cache keys matching pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Failed to clear cache pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.error(`Failed to increment key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set with expiry in one command
   */
  async setex(key: string, ttl: number, value: string): Promise<void> {
    try {
      await this.redis.setex(key, ttl, value);
    } catch (error) {
      this.logger.error(`Failed to setex key ${key}:`, error);
      throw error;
    }
  }
}
