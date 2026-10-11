import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/role.enum.js';

export class CreateUserDto {
  /**
   * User full name
   * @example John Doe
   */
  @IsString()
  @IsNotEmpty()
  name!: string;

  /**
   * User email address
   * @example john.doe@company.com
   */
  @IsEmail()
  email!: string;

  /**
   * Initial password (minimum 6 characters)
   * @example Password123!
   */
  @IsString()
  @MinLength(6)
  password!: string;

  /**
   * User role
   * @example EMPLOYEE
   */
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
