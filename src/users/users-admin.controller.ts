import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ApiDoc } from '../common/decorators/api-doc.decorator.js';
import { UserRole } from '../common/enums/role.enum.js';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import {
  PaginatedUserResponseDto,
  UserResponseDto,
} from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Admin Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'List all users (Admin)',
    description:
      'Retrieves paginated list of all users with search, role, and active status filters.',
    status: HttpStatus.OK,
    responseType: PaginatedUserResponseDto,
    responseDescription: 'Users list retrieved successfully',
    isAuth: true,
  })
  async getAllUsers(
    @Query() query: QueryUsersDto,
  ): Promise<PaginatedUserResponseDto> {
    return this.usersService.getAllUsers(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc({
    summary: 'Create a new user (Admin)',
    description:
      'Creates a new employee or administrator account with a hashed password.',
    status: HttpStatus.CREATED,
    responseType: UserResponseDto,
    responseDescription: 'User successfully created',
    isAuth: true,
  })
  async createUser(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Get user details by ID (Admin)',
    description: 'Retrieves complete profile details for a specific user ID.',
    status: HttpStatus.OK,
    responseType: UserResponseDto,
    responseDescription: 'User details retrieved successfully',
    isAuth: true,
  })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Update employee details (Admin)',
    description:
      'Updates employee details such as name, email, role, or resets password.',
    status: HttpStatus.OK,
    responseType: UserResponseDto,
    responseDescription: 'User details updated successfully',
    isAuth: true,
  })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.adminUpdateUser(id, dto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'Update user active status (Admin)',
    description:
      'Activates or deactivates an employee account. Admins cannot deactivate their own account.',
    status: HttpStatus.OK,
    responseType: UserResponseDto,
    responseDescription: 'User status successfully updated',
    isAuth: true,
  })
  async updateUserStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUserStatus(admin.id, id, dto);
  }
}
