import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /**
   * Registered email address
   * @example employee@acme.com
   */
  @IsEmail()
  email!: string;

  /**
   * User account password
   * @example Employee123!
   */
  @IsString()
  @IsNotEmpty()
  password!: string;
}
