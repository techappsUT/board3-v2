import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../cache/redis.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    external: Record<string, 'healthy' | 'unhealthy'>;
  };
  details?: {
    database?: any;
    redis?: any;
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async getHealthStatus(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const version = process.env.npm_package_version || '1.0.0';

    // Perform health checks
    const [databaseHealth, redisHealth, memoryStats] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.getMemoryStats(),
    ]);

    const checks = {
      database:
        databaseHealth.status === 'fulfilled' && databaseHealth.value
          ? ('healthy' as const)
          : ('unhealthy' as const),
      redis:
        redisHealth.status === 'fulfilled' && redisHealth.value
          ? ('healthy' as const)
          : ('unhealthy' as const),
      external: {} as Record<string, 'healthy' | 'unhealthy'>,
    };

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (checks.database === 'unhealthy') {
      status = 'unhealthy';
    } else if (checks.redis === 'unhealthy') {
      status = 'degraded';
    }

    const result: HealthCheckResult = {
      status,
      timestamp,
      uptime,
      version,
      checks,
    };

    // Add detailed information if requested or if there are issues
    if (status !== 'healthy' || process.env.NODE_ENV === 'development') {
      result.details = {};

      // Add memory stats if available
      if (memoryStats.status === 'fulfilled') {
        result.details.memory = {
          used: memoryStats.value.used,
          total: memoryStats.value.total,
          percentage: memoryStats.value.percentage,
        };
      }

      // Add database details
      if (databaseHealth.status === 'fulfilled') {
        result.details.database = databaseHealth.value;
      } else {
        result.details.database = { error: (databaseHealth.reason as Error)?.message };
      }

      // Add redis details
      if (redisHealth.status === 'fulfilled') {
        result.details.redis = redisHealth.value;
      } else {
        result.details.redis = { error: (redisHealth.reason as Error)?.message };
      }
    }

    // Log health check results
    if (status === 'unhealthy') {
      this.logger.error('Health check failed', result);
    } else if (status === 'degraded') {
      this.logger.warn('Health check degraded', result);
    } else {
      this.logger.debug('Health check passed');
    }

    return result;
  }

  private async checkDatabase(): Promise<boolean | any> {
    try {
      const isHealthy = await this.prisma.healthCheck();

      if (!isHealthy) {
        return false;
      }

      // Get additional database stats for detailed health info
      const stats = await this.prisma.getDatabaseStats();

      return {
        connected: true,
        stats,
        responseTime: Date.now(), // Could be enhanced with actual timing
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean | any> {
    try {
      const isHealthy = await this.redis.healthCheck();

      if (!isHealthy) {
        return false;
      }

      // Get Redis info for detailed health info
      const info = await this.redis.getInfo();

      return {
        connected: true,
        info: {
          version: info.redis_version,
          uptime: info.uptime_in_seconds,
          connected_clients: info.connected_clients,
          used_memory: info.used_memory,
          used_memory_human: info.used_memory_human,
        },
        responseTime: Date.now(), // Could be enhanced with actual timing
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  private async getMemoryStats() {
    const memoryUsage = process.memoryUsage();

    return {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      rss: memoryUsage.rss,
      external: memoryUsage.external,
    };
  }

  async checkExternalServices(): Promise<Record<string, 'healthy' | 'unhealthy'>> {
    const checks: Record<string, 'healthy' | 'unhealthy'> = {};

    // Check external services (could be expanded)
    // Example: Terraform Cloud, AWS APIs, etc.

    return checks;
  }

  async getMetrics() {
    try {
      const [healthStatus, databaseStats] = await Promise.all([
        this.getHealthStatus(),
        this.prisma.getDatabaseStats(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        system: {
          uptime: healthStatus.uptime,
          memory: healthStatus.details?.memory,
          version: healthStatus.version,
        },
        application: {
          status: healthStatus.status,
          database: healthStatus.details?.database,
          redis: healthStatus.details?.redis,
        },
        business: {
          ...databaseStats,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Readiness probe - checks if the application is ready to serve traffic
   */
  async readiness(): Promise<{ ready: boolean; checks: any }> {
    try {
      const health = await this.getHealthStatus();

      const ready = health.status !== 'unhealthy' && health.checks.database === 'healthy';

      return {
        ready,
        checks: health.checks,
      };
    } catch (error) {
      return {
        ready: false,
        checks: { error: (error as Error).message },
      };
    }
  }

  /**
   * Liveness probe - checks if the application is alive
   */
  async liveness(): Promise<{ alive: boolean }> {
    // Simple check - if we can execute this function, we're alive
    return { alive: true };
  }
}
