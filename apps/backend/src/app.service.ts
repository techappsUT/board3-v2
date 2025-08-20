import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getApiInfo(): Record<string, any> {
    return {
      name: 'Board3 API',
      version: '1.0.0',
      description: 'AI-powered cloud infrastructure management platform API',
      environment: this.configService.get('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      features: {
        visualDesigner: true,
        aiGeneration: true,
        multiCloud: true,
        realTimeCollaboration: true,
        terraformIntegration: true,
        securityCompliance: true,
      },
      security: {
        encryption: 'AES-256-GCM',
        authentication: 'JWT + MFA',
        authorization: 'RBAC',
        transport: 'TLS 1.3',
      },
      performance: {
        targetApiResponse: '<1ms simple, <10ms complex',
        targetDbQuery: '<5ms OLTP, <50ms analytics',
        maxConcurrentUsers: 1000,
      },
    };
  }

  getVersion(): Record<string, any> {
    return {
      version: '1.0.0',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}
