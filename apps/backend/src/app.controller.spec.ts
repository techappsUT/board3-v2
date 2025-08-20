import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                NODE_ENV: 'test',
                PORT: 3001,
                DATABASE_URL: 'postgresql://test:test@localhost:5432/board3_test',
              };
              return config[key as keyof typeof config] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  describe('getApiInfo', () => {
    it('should return API information', () => {
      const result = appController.getApiInfo();

      expect(result).toBeDefined();
      expect(result.name).toBe('Board3 API');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toContain('AI-powered cloud infrastructure');
      expect(result.environment).toBe('test');
      expect(result.features).toBeDefined();
      expect(result.security).toBeDefined();
      expect(result.performance).toBeDefined();
    });

    it('should include security information', () => {
      const result = appController.getApiInfo();

      expect(result.security).toEqual({
        encryption: 'AES-256-GCM',
        authentication: 'JWT + MFA',
        authorization: 'RBAC',
        transport: 'TLS 1.3',
      });
    });

    it('should include feature flags', () => {
      const result = appController.getApiInfo();

      expect(result.features).toEqual({
        visualDesigner: true,
        aiGeneration: true,
        multiCloud: true,
        realTimeCollaboration: true,
        terraformIntegration: true,
        securityCompliance: true,
      });
    });
  });

  describe('getVersion', () => {
    it('should return version information', () => {
      const result = appController.getVersion();

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0.0');
      expect(result.nodeVersion).toBe(process.version);
      expect(result.platform).toBe(process.platform);
      expect(result.arch).toBe(process.arch);
    });

    it('should include build information', () => {
      const result = appController.getVersion();

      expect(result).toHaveProperty('buildTime');
      expect(result).toHaveProperty('gitCommit');
      expect(typeof result.buildTime).toBe('string');
      expect(typeof result.gitCommit).toBe('string');
    });
  });
});
