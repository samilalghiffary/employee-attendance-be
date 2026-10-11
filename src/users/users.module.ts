import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersAdminController } from './users-admin.controller.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
