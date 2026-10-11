import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../common/enums/role.enum.js';
import { PrismaService } from '../prisma.service.js';
import { AuthService } from './auth.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaClient = {
    orm: {
      public: {
        User: {
          where: vi.fn(),
          create: vi.fn(),
        },
      },
    },
  };

  const mockJwtService = {
    signAsync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    prismaService = {
      client: mockPrismaClient as any,
    } as unknown as PrismaService;

    jwtService = mockJwtService as unknown as JwtService;
    authService = new AuthService(prismaService, jwtService);
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'Budi Santoso',
      email: 'budi@company.com',
      password: 'Password123!',
      role: UserRole.EMPLOYEE,
    };

    it('should successfully register a new user with hashed password', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      mockPrismaClient.orm.public.User.create.mockResolvedValue({
        id: 'user-uuid-123',
        name: registerDto.name,
        email: registerDto.email,
        role: registerDto.role,
        createdAt: '2026-10-11T03:00:00.000Z',
      });

      const result = await authService.register(registerDto);

      expect(mockPrismaClient.orm.public.User.where).toHaveBeenCalledWith({
        email: registerDto.email,
      });
      expect(mockPrismaClient.orm.public.User.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toBe('User successfully registered');
      expect(result.user.id).toBe('user-uuid-123');
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.role).toBe(UserRole.EMPLOYEE);
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'existing-id',
          email: registerDto.email,
        }),
      });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaClient.orm.public.User.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'budi@company.com',
      password: 'Password123!',
    };

    it('should successfully authenticate and return JWT token', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const existingUser = {
        id: 'user-uuid-123',
        email: loginDto.email,
        name: 'Budi Santoso',
        password: hashedPassword,
        role: UserRole.EMPLOYEE,
        createdAt: '2026-10-11T03:00:00.000Z',
      };

      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(existingUser),
      });

      mockJwtService.signAsync.mockResolvedValue('mocked-jwt-token');

      const result = await authService.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.user.id).toBe(existingUser.id);
      expect(result.user.role).toBe(UserRole.EMPLOYEE);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const wrongHashedPassword = await bcrypt.hash('DifferentPass!', 10);
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'user-uuid-123',
          email: loginDto.email,
          password: wrongHashedPassword,
          role: UserRole.EMPLOYEE,
        }),
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
