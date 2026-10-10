import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma.service.js';
import { ApiHealthDoc } from './health.decorator.js';
import { HealthResponseDto } from './health.dto.js';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiHealthDoc()
  async checkHealth(
    @Res({ passthrough: true }) res: Response,
  ): Promise<HealthResponseDto> {
    const startDb = Date.now();
    const isDbAlive = await this.prisma.ping();
    const dbResponseTimeMs = Date.now() - startDb;

    const isHealthy = isDbAlive;
    if (!isHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      database: {
        status: isDbAlive ? 'connected' : 'disconnected',
        responseTimeMs: dbResponseTimeMs,
      },
    };
  }
}
