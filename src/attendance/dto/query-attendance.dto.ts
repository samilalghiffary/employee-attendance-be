import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum.js';

export class QueryAttendanceDto extends PaginationQueryDto {
  /**
   * Filter start date (YYYY-MM-DD format)
   * @example 2026-10-01
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * Filter end date (YYYY-MM-DD format)
   * @example 2026-10-31
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class QueryAdminAttendanceDto extends QueryAttendanceDto {
  /**
   * Filter by specific employee User ID
   * @example 6059da3b-67a2-4920-8f6c-5dc1c93abbe5
   */
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * Filter by attendance status
   * @example PRESENT
   */
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}
