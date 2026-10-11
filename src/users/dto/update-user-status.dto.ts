import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateUserStatusDto {
  /**
   * Account activation status
   * @example false
   */
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}
