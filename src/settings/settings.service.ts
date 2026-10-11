import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type {
  UpdateWorkScheduleDto,
  WorkScheduleDataDto,
} from './dto/work-schedule.dto.js';

export const DEFAULT_SCHEDULE_KEY = 'DEFAULT_SCHEDULE';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWorkSchedule(): Promise<WorkScheduleDataDto> {
    const setting = await this.prisma.client.orm.public.SystemSetting.where({
      key: DEFAULT_SCHEDULE_KEY,
    }).first();

    if (!setting) {
      const created = await this.prisma.client.orm.public.SystemSetting.create({
        key: DEFAULT_SCHEDULE_KEY,
        workStartTime: '08:00',
        workEndTime: '17:00',
        lateToleranceMinutes: 15,
      });

      return {
        workStartTime: created.workStartTime,
        workEndTime: created.workEndTime,
        lateToleranceMinutes: created.lateToleranceMinutes,
        updatedAt: created.updatedAt,
      };
    }

    return {
      workStartTime: setting.workStartTime,
      workEndTime: setting.workEndTime,
      lateToleranceMinutes: setting.lateToleranceMinutes,
      updatedAt: setting.updatedAt,
    };
  }

  async updateWorkSchedule(
    dto: UpdateWorkScheduleDto,
  ): Promise<WorkScheduleDataDto> {
    const current = await this.getWorkSchedule();

    const updated = await this.prisma.client.orm.public.SystemSetting.where({
      key: DEFAULT_SCHEDULE_KEY,
    }).update({
      workStartTime: dto.workStartTime ?? current.workStartTime,
      workEndTime: dto.workEndTime ?? current.workEndTime,
      lateToleranceMinutes:
        dto.lateToleranceMinutes !== undefined
          ? dto.lateToleranceMinutes
          : current.lateToleranceMinutes,
    });

    if (!updated) {
      throw new Error('Failed to update system work schedule setting');
    }

    this.logger.log(
      `[Work Schedule Updated] Start: ${updated.workStartTime}, End: ${updated.workEndTime}, Grace: ${updated.lateToleranceMinutes}m`,
    );

    return {
      workStartTime: updated.workStartTime,
      workEndTime: updated.workEndTime,
      lateToleranceMinutes: updated.lateToleranceMinutes,
      updatedAt: updated.updatedAt,
    };
  }
}
