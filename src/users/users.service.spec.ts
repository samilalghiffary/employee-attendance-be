import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../common/enums/role.enum.js';
import { PrismaService } from '../prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaService: PrismaService;

  const mockPrismaClient = {
    orm: {
      public: {
        User: {
          where: vi.fn(),
          create: vi.fn(),
          all: vi.fn(),
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    prismaService = {
      client: mockPrismaClient as any,
    } as unknown as PrismaService;

    usersService = new UsersService(prismaService);
  });

  describe('getProfile', () => {
    it('should return user profile when found', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'budi@company.com',
          name: 'Budi',
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: '2026-10-11T00:00:00Z',
          updatedAt: '2026-10-11T00:00:00Z',
        }),
      });

      const res = await usersService.getProfile('user-1');

      expect(res.success).toBe(true);
      expect(res.data.email).toBe('budi@company.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      await expect(usersService.getProfile('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user name successfully', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'user-1' }),
      });

      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        update: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'budi@company.com',
          name: 'Budi Pratama',
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: '2026-10-11T00:00:00Z',
          updatedAt: '2026-10-11T00:00:00Z',
        }),
      });

      const res = await usersService.updateProfile('user-1', {
        name: 'Budi Pratama',
      });

      expect(res.success).toBe(true);
      expect(res.data.name).toBe('Budi Pratama');
    });
  });

  describe('changePassword', () => {
    it('should throw UnauthorizedException when old password is wrong', async () => {
      const hashedOld = await bcrypt.hash('CorrectPass123!', 10);
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'user-1',
          password: hashedOld,
        }),
      });

      await expect(
        usersService.changePassword('user-1', {
          oldPassword: 'WrongPass!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should successfully change password when old password matches', async () => {
      const hashedOld = await bcrypt.hash('CorrectPass123!', 10);
      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          id: 'user-1',
          password: hashedOld,
        }),
      });

      const updateMock = vi.fn().mockResolvedValue({});
      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        update: updateMock,
      });

      const res = await usersService.changePassword('user-1', {
        oldPassword: 'CorrectPass123!',
        newPassword: 'NewPassword123!',
      });

      expect(res.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('updateUserStatus', () => {
    it('should throw BadRequestException when admin tries to deactivate self', async () => {
      await expect(
        usersService.updateUserStatus('admin-1', 'admin-1', {
          isActive: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update employee status to inactive', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'emp-1', isActive: true }),
      });

      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        update: vi.fn().mockResolvedValue({
          id: 'emp-1',
          email: 'emp@company.com',
          name: 'Employee',
          role: UserRole.EMPLOYEE,
          isActive: false,
          createdAt: '2026-10-11T00:00:00Z',
          updatedAt: '2026-10-11T00:00:00Z',
        }),
      });

      const res = await usersService.updateUserStatus('admin-1', 'emp-1', {
        isActive: false,
      });

      expect(res.success).toBe(true);
      expect(res.data.isActive).toBe(false);
    });
  });

  describe('adminUpdateUser', () => {
    it('should update employee name and role', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          id: 'emp-1',
          email: 'emp@company.com',
          name: 'Old Name',
          role: UserRole.EMPLOYEE,
          isActive: true,
          createdAt: '2026-10-11T00:00:00Z',
          updatedAt: '2026-10-11T00:00:00Z',
        }),
      });

      mockPrismaClient.orm.public.User.where.mockReturnValueOnce({
        update: vi.fn().mockResolvedValue({
          id: 'emp-1',
          email: 'emp@company.com',
          name: 'New Name',
          role: UserRole.ADMIN,
          isActive: true,
          createdAt: '2026-10-11T00:00:00Z',
          updatedAt: '2026-10-11T00:00:00Z',
        }),
      });

      const res = await usersService.adminUpdateUser('emp-1', {
        name: 'New Name',
        role: UserRole.ADMIN,
      });

      expect(res.success).toBe(true);
      expect(res.data.name).toBe('New Name');
      expect(res.data.role).toBe(UserRole.ADMIN);
    });
  });

  describe('createUser', () => {
    it('should throw ConflictException if email exists', async () => {
      mockPrismaClient.orm.public.User.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'existing' }),
      });

      await expect(
        usersService.createUser({
          name: 'Test',
          email: 'test@company.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
