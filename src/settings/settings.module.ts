import { Module } from '@nestjs/common';
import { SettingsAdminController } from './settings-admin.controller.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({
  controllers: [SettingsController, SettingsAdminController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
