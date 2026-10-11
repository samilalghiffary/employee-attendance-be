import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ApiDoc } from '../common/decorators/api-doc.decorator.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  UpdateWorkScheduleDto,
  WorkScheduleResponseDto,
} from './dto/work-schedule.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('Admin Settings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/settings')
export class SettingsAdminController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch('work-schedule')
  @ApiDoc({
    summary: 'Update work schedule policy (Admin Only)',
    description:
      'Allows super admins to configure work start time, work end time, and late tolerance grace period dynamically.',
    responseType: WorkScheduleResponseDto,
    isAuth: true,
  })
  async updateWorkSchedule(
    @Body() dto: UpdateWorkScheduleDto,
  ): Promise<WorkScheduleResponseDto> {
    const data = await this.settingsService.updateWorkSchedule(dto);
    return {
      success: true,
      message: 'Work schedule policy updated successfully.',
      data,
    };
  }
}
