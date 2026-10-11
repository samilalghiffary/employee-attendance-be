import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  /**
   * Updated user full name
   * @example Budi Santoso Pratama
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /**
   * Updated user email address
   * @example budi.new@company.com
   */
  @IsOptional()
  @IsEmail()
  email?: string;
}
