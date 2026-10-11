import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UserRole } from '../common/enums/role.enum.js';
import { PrismaService } from '../prisma.service.js';
import type {
  LoginResponseDto,
  RegisterResponseDto,
  UserProfileDto,
} from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.client.orm.public.User.where({
      email: normalizedEmail,
    }).first();

    if (existingUser) {
      throw new ConflictException(
        `Email '${normalizedEmail}' is already registered`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const role = dto.role ?? UserRole.EMPLOYEE;

    const createdUser = await this.prisma.client.orm.public.User.create({
      email: normalizedEmail,
      name: dto.name.trim(),
      password: hashedPassword,
      role,
    });

    return {
      success: true,
      message: 'User successfully registered',
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        role: createdUser.role as UserRole,
        createdAt: createdUser.createdAt,
      },
    };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.client.orm.public.User.where({
      email: normalizedEmail,
    }).first();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException(
        'Account is inactive. Please contact administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const expiresIn = process.env['JWT_EXPIRES_IN'] ?? '1d';
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Login successful',
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        createdAt: user.createdAt,
      },
    };
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.client.orm.public.User.where({
      id: userId,
    }).first();

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      createdAt: user.createdAt,
    };
  }
}
