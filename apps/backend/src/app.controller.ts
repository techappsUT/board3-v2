import { Controller, Get, Version } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get API information' })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Board3 API' },
        version: { type: 'string', example: '1.0.0' },
        description: {
          type: 'string',
          example: 'AI-powered cloud infrastructure management platform API',
        },
        environment: { type: 'string', example: 'development' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', example: 12345 },
      },
    },
  })
  getApiInfo(): Record<string, any> {
    return this.appService.getApiInfo();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get API version' })
  @ApiResponse({
    status: 200,
    description: 'API version retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: '1.0.0' },
        buildTime: { type: 'string', format: 'date-time' },
        gitCommit: { type: 'string', example: 'abc123def456' },
      },
    },
  })
  getVersion(): Record<string, any> {
    return this.appService.getVersion();
  }
}
