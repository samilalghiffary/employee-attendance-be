import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import {
  createPaginatedResponse,
  getPaginationParams,
} from '../common/utils/pagination.util.js';
import { PrismaService } from '../prisma.service.js';
import type { AdminUpdateUserDto } from './dto/admin-update-user.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { QueryUsersDto } from './dto/query-users.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import {
  type PaginatedUserResponseDto,
  UserItemDto,
  type UserResponseDto,
} from './dto/user-response.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.client.orm.public.User.where({
      id: userId,
    }).first();

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      success: true,
      message: 'User profile retrieved successfully',
      data: UserItemDto.fromEntity(user),
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.client.orm.public.User.where({
      id: userId,
    }).first();

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const updatePayload: Record<string, any> = {};

    if (dto.name !== undefined) {
      updatePayload['name'] = dto.name.trim();
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.client.orm.public.User.where({
          email: normalizedEmail,
        }).first();

        if (existing) {
          throw new ConflictException(
            `Email '${normalizedEmail}' is already registered`,
          );
        }
        updatePayload['email'] = normalizedEmail;
      }
    }

    const updated = await this.prisma.client.orm.public.User.where({
      id: userId,
    }).update(updatePayload);

    if (!updated) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    return {
      success: true,
      message: 'Profile updated successfully',
      data: UserItemDto.fromEntity(updated),
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.client.orm.public.User.where({
      id: userId,
    }).first();

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Current password does not match');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.client.orm.public.User.where({
      id: userId,
    }).update({
      password: hashedPassword,
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await this.prisma.client.orm.public.User.where({
      email: normalizedEmail,
    }).first();

    if (existing) {
      throw new ConflictException(
        `Email '${normalizedEmail}' is already registered`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.client.orm.public.User.create({
      name: dto.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: dto.role ?? 'EMPLOYEE',
      isActive: true,
    });

    return {
      success: true,
      message: 'User created successfully',
      data: UserItemDto.fromEntity(created),
    };
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.client.orm.public.User.where({
      id,
    }).first();

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return {
      success: true,
      message: 'User retrieved successfully',
      data: UserItemDto.fromEntity(user),
    };
  }

  async updateUserStatus(
    adminId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ): Promise<UserResponseDto> {
    if (adminId === targetUserId) {
      throw new BadRequestException(
        'You cannot deactivate your own administrator account',
      );
    }

    const user = await this.prisma.client.orm.public.User.where({
      id: targetUserId,
    }).first();

    if (!user) {
      throw new NotFoundException(`User with ID '${targetUserId}' not found`);
    }

    const updated = await this.prisma.client.orm.public.User.where({
      id: targetUserId,
    }).update({
      isActive: dto.isActive,
    });

    if (!updated) {
      throw new NotFoundException(`User with ID '${targetUserId}' not found`);
    }

    return {
      success: true,
      message: `User status successfully updated to ${dto.isActive ? 'active' : 'inactive'}`,
      data: UserItemDto.fromEntity(updated),
    };
  }

  async adminUpdateUser(
    targetUserId: string,
    dto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.client.orm.public.User.where({
      id: targetUserId,
    }).first();

    if (!user) {
      throw new NotFoundException(`User with ID '${targetUserId}' not found`);
    }

    const updatePayload: Record<string, string | boolean> = {};

    if (dto.name !== undefined) {
      updatePayload['name'] = dto.name.trim();
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.client.orm.public.User.where({
          email: normalizedEmail,
        }).first();

        if (existing) {
          throw new ConflictException(
            `Email '${normalizedEmail}' is already registered`,
          );
        }
        updatePayload['email'] = normalizedEmail;
      }
    }

    if (dto.role !== undefined) {
      updatePayload['role'] = dto.role;
    }

    if (dto.password !== undefined) {
      updatePayload['password'] = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.client.orm.public.User.where({
      id: targetUserId,
    }).update(updatePayload);

    if (!updated) {
      throw new NotFoundException(`User with ID '${targetUserId}' not found`);
    }

    return {
      success: true,
      message: 'User details updated successfully',
      data: UserItemDto.fromEntity(updated),
    };
  }

  async getAllUsers(query: QueryUsersDto): Promise<PaginatedUserResponseDto> {
    const { page, limit, offset } = getPaginationParams(query);

    let collection = this.prisma.client.orm.public.User;

    if (query.role) {
      collection = collection.where((u) => u.role.eq(query.role!));
    }

    if (query.isActive !== undefined) {
      collection = collection.where((u) => u.isActive.eq(query.isActive!));
    }

    if (query.search) {
      const searchPattern = `%${query.search.trim()}%`;
      collection = collection.where(
        (u) => u.name.ilike(searchPattern) || u.email.ilike(searchPattern),
      );
    }

    const { total } = await collection.aggregate((agg) => ({
      total: agg.count(),
    }));

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    if (query.sortBy === 'isActive') {
      const allFiltered = await collection.all();
      const mapped = allFiltered.map((item) => UserItemDto.fromEntity(item));
      mapped.sort((a, b) => {
        const valA = a.isActive ? 1 : 0;
        const valB = b.isActive ? 1 : 0;
        const diff = sortOrder === 'asc' ? valA - valB : valB - valA;
        if (diff !== 0) return diff;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      const paginated = mapped.slice(offset, offset + limit);
      return createPaginatedResponse(paginated, total, page, limit);
    }

    const users = await collection
      .orderBy([
        (u) => {
          switch (sortBy) {
            case 'name':
              return sortOrder === 'asc' ? u.name.asc() : u.name.desc();
            case 'email':
              return sortOrder === 'asc' ? u.email.asc() : u.email.desc();
            case 'role':
              return sortOrder === 'asc' ? u.role.asc() : u.role.desc();
            case 'createdAt':
            default:
              return sortOrder === 'asc'
                ? u.createdAt.asc()
                : u.createdAt.desc();
          }
        },
        (u) => u.id.asc(),
      ])
      .limit(limit)
      .offset(offset)
      .all();

    return createPaginatedResponse(
      users.map((item) => UserItemDto.fromEntity(item)),
      total,
      page,
      limit,
    );
  }
}
