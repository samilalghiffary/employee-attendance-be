import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type ApiInfoResponse, AppService } from './app.service.js';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'API Information & Root Discovery',
    description:
      'Provides general metadata, current version, environment, and links to documentation and health check.',
  })
  @ApiResponse({
    status: 200,
    description: 'API information retrieved successfully.',
    schema: {
      example: {
        name: 'Employee Attendance API',
        version: '1.0.0',
        description:
          'Production-ready backend API for Employee Attendance Management System',
        environment: 'development',
        endpoints: {
          docs: '/api/docs',
          health: '/api/health',
        },
      },
    },
  })
  getApiInfo(): ApiInfoResponse {
    return this.appService.getApiInfo();
  }
}
