import { AttendanceStatus } from '../../common/enums/attendance-status.enum.js';

export class AttendanceItemDto {
  /**
   * Unique attendance record ID
   * @example d8f1a179-8b91-4cf4-916c-e40243eec345
   */
  id!: string;

  /**
   * Employee user ID
   * @example 6059da3b-67a2-4920-8f6c-5dc1c93abbe5
   */
  userId!: string;

  /**
   * Attendance date (YYYY-MM-DD format)
   * @example 2026-10-11
   */
  date!: string;

  /**
   * Check-in timestamp (ISO format)
   * @example 2026-10-11T08:15:00.000Z
   */
  checkIn!: string | null;

  /**
   * Check-out timestamp (ISO format)
   * @example 2026-10-11T17:00:00.000Z
   */
  checkOut!: string | null;

  /**
   * Attendance status
   * @example PRESENT
   */
  status!: AttendanceStatus;

  /**
   * Attendance notes
   * @example Arrived on time for the morning standup
   */
  notes!: string | null;

  /**
   * Record creation timestamp
   * @example 2026-10-11T08:15:00.000Z
   */
  createdAt!: string;

  /**
   * Employee user profile details
   */
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export class AttendanceResponseDto {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * Operation feedback message
   * @example Check-in recorded successfully
   */
  message!: string;

  /**
   * Attendance record details
   */
  data!: AttendanceItemDto;
}

export class TodayAttendanceResponseDto {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * Whether employee has checked in today
   * @example true
   */
  hasCheckedIn!: boolean;

  /**
   * Whether employee has checked out today
   * @example false
   */
  hasCheckedOut!: boolean;

  /**
   * Today's attendance details (null if not checked in)
   */
  data!: AttendanceItemDto | null;
}

import {
  PaginationMetaDto,
  type PaginatedResult,
} from '../../common/dto/pagination.dto.js';

export class PaginatedAttendanceResponseDto implements PaginatedResult<AttendanceItemDto> {
  /**
   * Operation success indicator
   * @example true
   */
  success!: boolean;

  /**
   * List of attendance records
   */
  data!: AttendanceItemDto[];

  /**
   * Pagination metadata
   */
  meta!: PaginationMetaDto;
}
