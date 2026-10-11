import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ApiDoc } from '../common/decorators/api-doc.decorator.js';
import { WorkScheduleResponseDto } from './dto/work-schedule.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Settings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('work-schedule')
  @ApiDoc({
    summary: 'Get active work schedule policy',
    description:
      'Returns the current working hours policy (start time, end time, and late tolerance grace period) for employee display.',
    responseType: WorkScheduleResponseDto,
    isAuth: true,
  })
  async getWorkSchedule(): Promise<WorkScheduleResponseDto> {
    const data = await this.settingsService.getWorkSchedule();
    return {
      success: true,
      data,
    };
  }
}
