import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckOutDto {
  /**
   * Optional notes or work summary upon checking out
   * @example Completed sprint review tasks
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
