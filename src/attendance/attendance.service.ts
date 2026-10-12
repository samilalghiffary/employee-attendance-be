import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AttendanceStatus } from '../common/enums/attendance-status.enum.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  calculateLateArrival,
  createWorkEndTimestamp,
  getLocalDateString,
} from '../common/utils/date.util.js';
import {
  createPaginatedResponse,
  getPaginationParams,
} from '../common/utils/pagination.util.js';
import { PrismaService } from '../prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  AttendanceItemDto,
  type AttendanceResponseDto,
  type PaginatedAttendanceResponseDto,
  type TodayAttendanceResponseDto,
} from './dto/attendance-response.dto.js';
import type { CheckInDto } from './dto/check-in.dto.js';
import type { CheckOutDto } from './dto/check-out.dto.js';
import type {
  QueryAdminAttendanceDto,
  QueryAttendanceDto,
} from './dto/query-attendance.dto.js';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async checkIn(
    userId: string,
    dto: CheckInDto,
  ): Promise<AttendanceResponseDto> {
    if (
      dto.latitude == null ||
      dto.longitude == null ||
      Number.isNaN(Number(dto.latitude)) ||
      Number.isNaN(Number(dto.longitude))
    ) {
      throw new BadRequestException(
        'Geolocation coordinates (latitude and longitude) are required for check-in.',
      );
    }

    const now = new Date();
    const todayStr = getLocalDateString(now);

    const existing = await this.prisma.client.orm.public.Attendance.where({
      userId,
      date: todayStr,
    }).first();

    if (existing) {
      if (existing.status === AttendanceStatus.ABSENT) {
        throw new ConflictException(
          'Attendance for today has already been closed as Absent.',
        );
      }
      throw new ConflictException('You have already checked in for today.');
    }

    const schedule = await this.settingsService.getWorkSchedule();
    const { isLate, lateMinutes } = calculateLateArrival(
      now,
      schedule.workStartTime,
      schedule.lateToleranceMinutes,
    );

    const status = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    const checkInNotes = dto.notes?.trim()
      ? `Checkin: ${dto.notes.trim()}`
      : null;

    const record = await this.prisma.client.orm.public.Attendance.create({
      userId,
      date: todayStr,
      checkIn: now.toISOString(),
      checkInLat: Number(dto.latitude),
      checkInLng: Number(dto.longitude),
      status,
      notes: checkInNotes,
    });

    const successMessage =
      status === AttendanceStatus.LATE
        ? `Check-in recorded successfully (Late by ${lateMinutes} minutes).`
        : 'Check-in recorded successfully (On Time).';

    return {
      success: true,
      message: successMessage,
      data: AttendanceItemDto.fromEntity(
        record,
        schedule.workStartTime,
        schedule.lateToleranceMinutes,
      ),
    };
  }

  async checkOut(
    userId: string,
    dto: CheckOutDto,
  ): Promise<AttendanceResponseDto> {
    if (
      dto.latitude == null ||
      dto.longitude == null ||
      Number.isNaN(Number(dto.latitude)) ||
      Number.isNaN(Number(dto.longitude))
    ) {
      throw new BadRequestException(
        'Geolocation coordinates (latitude and longitude) are required for check-out.',
      );
    }

    const now = new Date();
    const todayStr = getLocalDateString(now);

    const existing = await this.prisma.client.orm.public.Attendance.where({
      userId,
      date: todayStr,
    }).first();

    if (!existing) {
      throw new BadRequestException(
        'You have not checked in today. Please check in first.',
      );
    }

    if (existing.checkOut) {
      throw new ConflictException('You have already checked out for today.');
    }

    const checkoutNote = dto.notes?.trim()
      ? `Checkout: ${dto.notes.trim()}`
      : null;
    const updatedNotes = checkoutNote
      ? existing.notes
        ? `${existing.notes} | ${checkoutNote}`
        : checkoutNote
      : existing.notes;

    const updated = await this.prisma.client.orm.public.Attendance.where({
      id: existing.id,
    }).update({
      checkOut: now.toISOString(),
      checkOutLat: Number(dto.latitude),
      checkOutLng: Number(dto.longitude),
      notes: updatedNotes,
    });

    return {
      success: true,
      message: 'Check-out recorded successfully.',
      data: AttendanceItemDto.fromEntity(updated),
    };
  }

  async getTodayStatus(userId: string): Promise<TodayAttendanceResponseDto> {
    const todayStr = getLocalDateString(new Date());

    const record = await this.prisma.client.orm.public.Attendance.where({
      userId,
      date: todayStr,
    }).first();

    if (!record) {
      return {
        success: true,
        hasCheckedIn: false,
        hasCheckedOut: false,
        isAbsent: false,
        canCheckIn: true,
        data: null,
      };
    }

    const hasCheckedIn = !!record.checkIn;
    const hasCheckedOut = !!record.checkOut;
    const isAbsent = record.status === AttendanceStatus.ABSENT;
    const canCheckIn = !hasCheckedIn && !isAbsent;

    return {
      success: true,
      hasCheckedIn,
      hasCheckedOut,
      isAbsent,
      canCheckIn,
      data: AttendanceItemDto.fromEntity(record),
    };
  }

  async getMyHistory(
    userId: string,
    query: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    const { page, limit, offset } = getPaginationParams(query);

    const allUserRecords = await this.prisma.client.orm.public.Attendance.where(
      {
        userId,
      },
    )
      .orderBy([(row) => row.date.desc(), (row) => row.id.asc()])
      .all();

    let filtered = allUserRecords;

    if (query.startDate) {
      filtered = filtered.filter((item) => item.date >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter((item) => item.date <= query.endDate!);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return createPaginatedResponse(
      paginated.map((item) => AttendanceItemDto.fromEntity(item)),
      total,
      page,
      limit,
    );
  }

  async getAdminOverview(
    query: QueryAdminAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    const { page, limit, offset } = getPaginationParams(query);

    const allRecords = await this.prisma.client.orm.public.Attendance.include(
      'user',
    )
      .orderBy([(row) => row.date.desc(), (row) => row.id.asc()])
      .all();

    let filtered = allRecords;

    if (query.userId) {
      filtered = filtered.filter((item) => item.userId === query.userId);
    }
    if (query.status) {
      filtered = filtered.filter((item) => item.status === query.status);
    }
    if (query.startDate) {
      filtered = filtered.filter((item) => item.date >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter((item) => item.date <= query.endDate!);
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return createPaginatedResponse(
      paginated.map((item) => AttendanceItemDto.fromEntity(item)),
      total,
      page,
      limit,
    );
  }

  async getSummary(query: { startDate?: string; endDate?: string }) {
    const activeEmployees = await this.prisma.client.orm.public.User.where({
      role: UserRole.EMPLOYEE,
      isActive: true,
    }).all();

    const allAttendances = await this.prisma.client.orm.public.Attendance.all();

    let filtered = allAttendances;
    if (query.startDate) {
      filtered = filtered.filter((a) => a.date >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter((a) => a.date <= query.endDate!);
    }

    const totalPresent = filtered.filter(
      (a) => a.status === AttendanceStatus.PRESENT,
    ).length;
    const totalLate = filtered.filter(
      (a) => a.status === AttendanceStatus.LATE,
    ).length;
    const totalLeave = filtered.filter(
      (a) => a.status === AttendanceStatus.LEAVE,
    ).length;
    const totalAbsent = filtered.filter(
      (a) => a.status === AttendanceStatus.ABSENT,
    ).length;

    const totalExpected = activeEmployees.length;
    const attendedCount = totalPresent + totalLate;
    const ratePercent =
      totalExpected > 0
        ? ((attendedCount / totalExpected) * 100).toFixed(1) + '%'
        : '0.0%';

    return {
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: {
        totalEmployees: activeEmployees.length,
        totalPresent,
        totalLate,
        totalLeave,
        totalAbsent,
        attendanceRate: ratePercent,
      },
    };
  }

  @Cron('59 23 * * 1-5', { timeZone: 'Asia/Jakarta' })
  async handleDailyAbsentCron(): Promise<void> {
    const todayStr = getLocalDateString(new Date());
    this.logger.log(
      `[Cron] Running end-of-day attendance procedures for date: ${todayStr}`,
    );

    const autoCheckedOut = await this.autoCheckOutMissingRecords(todayStr);
    this.logger.log(
      `[Cron] Successfully auto checked-out ${autoCheckedOut.count} employee(s) for ${todayStr}.`,
    );

    const marked = await this.markDailyAbsents(todayStr);
    this.logger.log(
      `[Cron] Successfully marked ${marked.count} employee(s) as ABSENT for ${todayStr}.`,
    );
  }

  async autoCheckOutMissingRecords(
    targetDate?: string,
  ): Promise<{ count: number; date: string }> {
    const dateStr = targetDate ?? getLocalDateString(new Date());
    const schedule = await this.settingsService.getWorkSchedule();
    const fallbackCheckOutTime = createWorkEndTimestamp(
      dateStr,
      schedule.workEndTime,
    );

    const recordsNeedingCheckOut =
      await this.prisma.client.orm.public.Attendance.where({
        date: dateStr,
      }).all();

    const missingCheckOut = recordsNeedingCheckOut.filter(
      (a) =>
        a.checkIn != null &&
        a.checkOut == null &&
        a.status !== AttendanceStatus.ABSENT,
    );

    let count = 0;
    for (const record of missingCheckOut) {
      const autoNote = record.notes
        ? `${record.notes} | System: Auto checked-out at end of day (fallback)`
        : 'System: Auto checked-out at end of day (fallback)';

      await this.prisma.client.orm.public.Attendance.where({
        id: record.id,
      }).update({
        checkOut: fallbackCheckOutTime,
        notes: autoNote,
      });
      count++;
    }

    return {
      count,
      date: dateStr,
    };
  }

  async markDailyAbsents(
    targetDate?: string,
  ): Promise<{ count: number; date: string }> {
    const dateStr = targetDate ?? getLocalDateString(new Date());

    const activeEmployees = await this.prisma.client.orm.public.User.where({
      role: UserRole.EMPLOYEE,
      isActive: true,
    }).all();

    const attendancesOnDate =
      await this.prisma.client.orm.public.Attendance.where({
        date: dateStr,
      }).all();

    const existingUserIds = new Set(attendancesOnDate.map((a) => a.userId));
    const absentEmployees = activeEmployees.filter(
      (emp) => !existingUserIds.has(emp.id),
    );

    let createdCount = 0;
    for (const emp of absentEmployees) {
      await this.prisma.client.orm.public.Attendance.create({
        userId: emp.id,
        date: dateStr,
        status: AttendanceStatus.ABSENT,
        notes: 'System: Automatically marked as Absent',
      });
      createdCount++;
    }

    return {
      count: createdCount,
      date: dateStr,
    };
  }

  async deleteAttendance(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.client.orm.public.Attendance.where({
      id,
    }).first();

    if (!existing) {
      throw new NotFoundException(
        `Attendance record with ID '${id}' not found.`,
      );
    }

    await this.prisma.client.orm.public.Attendance.where({ id }).delete();

    return {
      success: true,
      message: 'Attendance record deleted successfully.',
    };
  }
}
