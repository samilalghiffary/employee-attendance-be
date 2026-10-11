import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  /**
   * Current account password
   * @example OldPassword123!
   */
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  /**
   * New account password (minimum 6 characters)
   * @example NewPassword123!
   */
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
