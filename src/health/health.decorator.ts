import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthResponseDto } from './health.dto.js';

/**
 * Composite Swagger decorator specifically for the Health Check endpoint.
 */
export function ApiHealthDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Check application and database health',
      description:
        'Returns server status, process uptime, ISO timestamp, and PostgreSQL database connectivity metrics.',
    }),
    ApiResponse({
      status: 200,
      description: 'Service and database are operational',
      type: HealthResponseDto,
    }),
    ApiResponse({
      status: 503,
      description: 'Database connection failed or service is degraded',
      type: HealthResponseDto,
      example: {
        status: 'error',
        timestamp: '2026-10-10T17:58:00.000Z',
        uptimeSeconds: 120.45,
        database: {
          status: 'disconnected',
          responseTimeMs: 0,
        },
      },
    }),
  );
}
