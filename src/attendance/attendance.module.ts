import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AttendanceAdminController } from './attendance-admin.controller.js';
import { AttendanceController } from './attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [AuthModule, SettingsModule],
  controllers: [AttendanceController, AttendanceAdminController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
