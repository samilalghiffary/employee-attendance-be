import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CheckOutDto {
  /**
   * Optional notes or work summary upon checking out
   * @example Completed sprint review tasks
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  /**
   * Latitude coordinate of check-out location (required)
   * @example -6.200000
   */
  @IsNotEmpty()
  @IsLatitude()
  latitude!: number;

  /**
   * Longitude coordinate of check-out location (required)
   * @example 106.816666
   */
  @IsNotEmpty()
  @IsLongitude()
  longitude!: number;
}
