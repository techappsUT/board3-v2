import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL') || 'postgresql://localhost:5432/board3_dev',
        },
      },
      log: [
        { level: 'warn' as const, emit: 'event' as const },
        { level: 'info' as const, emit: 'event' as const },
        { level: 'error' as const, emit: 'event' as const },
      ],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    // Set up logging (disabled for now due to TypeScript issues)
    // this.$on('warn', (e: any) => {
    //   this.logger.warn(e.message);
    // });

    // this.$on('info', (e: any) => {
    //   this.logger.debug(e.message);
    // });

    // this.$on('error', (e: any) => {
    //   this.logger.error(e.message);
    // });

    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Clean database function for testing
   */
  async cleanDatabase() {
    if (this.configService.get('NODE_ENV') !== 'test') {
      throw new Error('Clean database can only be used in test environment');
    }

    const tables = await this.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '%prisma%'
    `;

    // Disable foreign key checks
    await this.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

    // Truncate all tables
    for (const { table_name } of tables) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table_name}" RESTART IDENTITY CASCADE`);
    }

    // Re-enable foreign key checks
    await this.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;

    this.logger.log('Database cleaned for testing');
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    const [userCount, organizationCount, designCount, templateCount, pipelineCount, stateCount] =
      await Promise.all([
        this.user.count(),
        this.organization.count(),
        this.design.count(),
        this.template.count(),
        this.pipeline.count(),
        this.state.count(),
      ]);

    return {
      users: userCount,
      organizations: organizationCount,
      designs: designCount,
      templates: templateCount,
      pipelines: pipelineCount,
      states: stateCount,
    };
  }

  /**
   * Execute raw SQL with error handling
   */
  async executeRawQuery(query: string, params: any[] = []) {
    try {
      return await this.$queryRawUnsafe(query, ...params);
    } catch (error) {
      this.logger.error(`Raw query failed: ${query}`, error);
      throw error;
    }
  }

  /**
   * Batch transaction helper
   */
  async batchTransaction<T>(operations: ((tx: PrismaService) => Promise<T>)[]): Promise<T[]> {
    return this.$transaction(
      async (tx: any) => {
        const results: T[] = [];
        for (const operation of operations) {
          results.push(await operation(tx));
        }
        return results;
      },
      {
        maxWait: 5000, // 5 seconds
        timeout: 10000, // 10 seconds
      }
    );
  }
}
