import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiDoc } from '../common/decorators/api-doc.decorator.js';
import { AuthService } from './auth.service.js';
import {
  type AuthenticatedUser,
  CurrentUser,
} from './decorators/current-user.decorator.js';
import {
  LoginResponseDto,
  RegisterResponseDto,
  UserProfileDto,
} from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

@ApiTags('Auth & RBAC')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiDoc({
    summary: 'Register new employee or admin',
    description:
      'Creates a new user account with hashed password. Default role is EMPLOYEE.',
    status: HttpStatus.CREATED,
    responseType: RegisterResponseDto,
    responseDescription: 'User successfully created',
  })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiDoc({
    summary: 'User login',
    description:
      'Validates credentials and returns JWT bearer token along with user info.',
    status: HttpStatus.OK,
    responseType: LoginResponseDto,
    responseDescription: 'Login successful with JWT access token',
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiDoc({
    summary: 'Get current user profile',
    description:
      'Returns the authenticated user details from the verified JWT access token.',
    status: HttpStatus.OK,
    responseType: UserProfileDto,
    isAuth: true,
  })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserProfileDto> {
    return this.authService.getProfile(user.id);
  }
}
