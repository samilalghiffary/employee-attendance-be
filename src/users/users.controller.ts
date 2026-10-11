import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ApiDoc } from '../common/decorators/api-doc.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Get current user profile',
    description: 'Retrieves profile details for the authenticated user.',
    status: HttpStatus.OK,
    responseType: UserResponseDto,
    responseDescription: 'User profile retrieved successfully',
    isAuth: true,
  })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Update current user profile',
    description:
      'Updates profile information (name, email) for the authenticated user.',
    status: HttpStatus.OK,
    responseType: UserResponseDto,
    responseDescription: 'Profile updated successfully',
    isAuth: true,
  })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Change current user password',
    description:
      'Changes user password after verifying that the current password matches.',
    status: HttpStatus.OK,
    responseDescription: 'Password changed successfully',
    isAuth: true,
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersService.changePassword(user.id, dto);
  }
}
