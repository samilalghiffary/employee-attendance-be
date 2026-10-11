import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/role.enum.js';

export class RegisterDto {
  /**
   * User full name
   * @example Budi Santoso
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * Unique valid email address
   * @example budi.santoso@company.com
   */
  @IsEmail()
  email!: string;

  /**
   * Password (minimum 6 characters)
   * @example Password123!
   */
  @MinLength(6)
  @IsString()
  password!: string;

  /**
   * Role of the user
   * @example EMPLOYEE
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
