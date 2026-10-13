import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryAttendanceSummaryDto {
  /**
   * Filter metrics from start date (YYYY-MM-DD format)
   * @example 2026-10-01
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * Filter metrics up to end date (YYYY-MM-DD format)
   * @example 2026-10-31
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * Filter metrics for a specific employee by ID
   * @example d8f1a179-8b91-4cf4-916c-e40243eec345
   */
  @IsOptional()
  @IsUUID('4')
  userId?: string;
}
