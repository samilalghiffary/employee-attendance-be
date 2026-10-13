import { AttendanceStatus } from '../../common/enums/attendance-status.enum.js';
import {
  calculateEarlyLeave,
  calculateLateArrival,
} from '../../common/utils/date.util.js';
import type { StorageColumnTypes } from '../../prisma/contract.d.js';

export type AttendanceStorageRecord =
  StorageColumnTypes['public']['Attendance'];
export type AttendanceUserRelation = Pick<
  StorageColumnTypes['public']['User'],
  'id' | 'name' | 'email'
>;

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
   * Latitude coordinate of check-in location
   * @example -6.200000
   */
  checkInLat!: number | null;

  /**
   * Longitude coordinate of check-in location
   * @example 106.816666
   */
  checkInLng!: number | null;

  /**
   * Check-out timestamp (ISO format)
   * @example 2026-10-11T17:00:00.000Z
   */
  checkOut!: string | null;

  /**
   * Latitude coordinate of check-out location
   * @example -6.200000
   */
  checkOutLat!: number | null;

  /**
   * Longitude coordinate of check-out location
   * @example 106.816666
   */
  checkOutLng!: number | null;

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
   * Minutes late if arrival exceeded grace period (0 if on time or not late)
   * @example 25
   */
  lateMinutes!: number;

  /**
   * Minutes early if departure was before workEndTime (0 if on time or after hours)
   * @example 30
   */
  earlyLeaveMinutes!: number;

  /**
   * Employee user profile details
   */
  user?: {
    id: string;
    name: string;
    email: string;
  };

  static fromEntity(
    record: AttendanceStorageRecord & { user?: AttendanceUserRelation | null },
    workStartTime: string = '08:00',
    lateToleranceMinutes: number = 15,
    workEndTime: string = '17:00',
  ): AttendanceItemDto {
    let lateMinutes = Number(record.lateMinutes ?? 0);
    if (
      !lateMinutes &&
      record.status === AttendanceStatus.LATE &&
      record.checkIn
    ) {
      const checkInDate = new Date(record.checkIn);
      const { lateMinutes: computedMinutes } = calculateLateArrival(
        checkInDate,
        workStartTime,
        lateToleranceMinutes,
      );
      lateMinutes = computedMinutes;
    }

    let earlyLeaveMinutes = Number(record.earlyLeaveMinutes ?? 0);
    if (!earlyLeaveMinutes && record.checkOut) {
      const checkOutDate = new Date(record.checkOut);
      const { earlyMinutes: computedEarly } = calculateEarlyLeave(
        checkOutDate,
        workEndTime,
      );
      earlyLeaveMinutes = computedEarly;
    }

    return {
      id: record.id,
      userId: record.userId,
      date: record.date,
      checkIn: record.checkIn ?? null,
      checkInLat: record.checkInLat != null ? Number(record.checkInLat) : null,
      checkInLng: record.checkInLng != null ? Number(record.checkInLng) : null,
      checkOut: record.checkOut ?? null,
      checkOutLat:
        record.checkOutLat != null ? Number(record.checkOutLat) : null,
      checkOutLng:
        record.checkOutLng != null ? Number(record.checkOutLng) : null,
      status: record.status as AttendanceStatus,
      notes: record.notes ?? null,
      createdAt: record.createdAt,
      lateMinutes,
      earlyLeaveMinutes,
      user: record.user
        ? {
            id: record.user.id,
            name: record.user.name,
            email: record.user.email,
          }
        : undefined,
    };
  }
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
   * Whether employee has been marked as absent for today
   * @example false
   */
  isAbsent!: boolean;

  /**
   * Convenient UI flag indicating if employee is currently eligible to check-in
   * @example false
   */
  canCheckIn!: boolean;

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
