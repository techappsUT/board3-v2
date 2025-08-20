import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({
    status: 200,
    description: 'Health check completed',
    type: Object,
  })
  async getHealth(): Promise<HealthCheckResult> {
    return this.healthService.getHealthStatus();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve traffic',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready',
  })
  async readiness() {
    const result = await this.healthService.readiness();

    if (!result.ready) {
      // Return 503 Service Unavailable if not ready
      throw new Error('Application not ready');
    }

    return result;
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  async liveness() {
    return this.healthService.liveness();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get application metrics' })
  @ApiResponse({
    status: 200,
    description: 'Application metrics',
    type: Object,
  })
  async getMetrics() {
    return this.healthService.getMetrics();
  }
}
