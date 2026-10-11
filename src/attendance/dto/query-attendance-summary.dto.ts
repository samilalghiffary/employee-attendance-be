import { IsDateString, IsOptional } from 'class-validator';

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
}
