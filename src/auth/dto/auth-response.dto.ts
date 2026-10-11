import { UserRole } from '../../common/enums/role.enum.js';

export class UserProfileDto {
  /**
   * Unique user ID
   * @example 6059da3b-67a2-4920-8f6c-5dc1c93abbe5
   */
  id!: string;

  /**
   * User registered email
   * @example budi.santoso@company.com
   */
  email!: string;

  /**
   * User full name
   * @example Budi Santoso
   */
  name!: string;

  /**
   * Assigned user role
   * @example EMPLOYEE
   */
  role!: UserRole;

  /**
   * Account registration timestamp
   * @example 2026-10-11T03:00:00.000Z
   */
  createdAt!: string;
}

export class RegisterResponseDto {
  /**
   * Response status indicator
   * @example true
   */
  success!: boolean;

  /**
   * Feedback message
   * @example User successfully registered
   */
  message!: string;

  /**
   * Created user details
   */
  user!: UserProfileDto;
}

export class LoginResponseDto {
  /**
   * Response status indicator
   * @example true
   */
  success!: boolean;

  /**
   * Feedback message
   * @example Login successful
   */
  message!: string;

  /**
   * JWT Bearer Access Token
   * @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  accessToken!: string;

  /**
   * Token scheme type
   * @example Bearer
   */
  tokenType!: string;

  /**
   * Token lifetime duration
   * @example 1d
   */
  expiresIn!: string;

  /**
   * Authenticated user profile
   */
  user!: UserProfileDto;
}
