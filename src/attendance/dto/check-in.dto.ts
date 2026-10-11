import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CheckInDto {
  /**
   * Optional notes upon checking in
   * @example Arrived on time for the morning standup
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;

  /**
   * Latitude coordinate of check-in location (required)
   * @example -6.200000
   */
  @IsNotEmpty()
  @IsLatitude()
  latitude!: number;

  /**
   * Longitude coordinate of check-in location (required)
   * @example 106.816666
   */
  @IsNotEmpty()
  @IsLongitude()
  longitude!: number;
}
