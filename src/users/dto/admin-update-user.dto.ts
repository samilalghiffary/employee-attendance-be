import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/role.enum.js';

export class AdminUpdateUserDto {
  /**
   * Updated employee full name
   * @example Budi Santoso
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * Updated employee email address
   * @example budi.santoso@company.com
   */
  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * Updated employee role
   * @example ADMIN
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /**
   * Reset employee password (minimum 6 characters)
   * @example NewSecret123!
   */
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
