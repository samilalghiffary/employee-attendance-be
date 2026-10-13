import {
  PaginationMetaDto,
  type PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { UserRole } from '../../common/enums/role.enum.js';
import type { StorageColumnTypes } from '../../prisma/contract.d.js';

export type UserStorageRecord = StorageColumnTypes['public']['User'];

export class UserItemDto {
  /**
   * Unique user ID
   * @example 6059da3b-67a2-4920-8f6c-5dc1c93abbe5
   */
  id!: string;

  /**
   * User email address
   * @example budi@company.com
   */
  email!: string;

  /**
   * User full name
   * @example Budi Santoso
   */
  name!: string;

  /**
   * User role
   * @example EMPLOYEE
   */
  role!: UserRole;

  /**
   * Account active state
   * @example true
   */
  isActive!: boolean;

  /**
   * Account creation timestamp
   * @example 2026-10-11T03:00:00.000Z
   */
  createdAt!: string;

  /**
   * Account last update timestamp
   * @example 2026-10-11T03:00:00.000Z
   */
  updatedAt!: string;

  static fromEntity(
    user:
      | UserStorageRecord
      | (Omit<UserStorageRecord, 'password'> & { password?: string }),
  ): UserItemDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export class UserResponseDto {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * Operation feedback message
   * @example User profile retrieved successfully
   */
  message!: string;

  /**
   * User details
   */
  data!: UserItemDto;
}

export class PaginatedUserResponseDto implements PaginatedResult<UserItemDto> {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * List of users
   */
  data!: UserItemDto[];

  /**
   * Pagination metadata
   */
  meta!: PaginationMetaDto;
}
