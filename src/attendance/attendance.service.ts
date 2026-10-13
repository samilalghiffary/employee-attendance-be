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
  calculateEarlyLeave,
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
import type { MyAttendanceSummaryResponseDto } from './dto/my-attendance-summary.dto.js';
import type { QueryAttendanceSummaryDto } from './dto/query-attendance-summary.dto.js';
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
      lateMinutes: isLate ? lateMinutes : 0,
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

    const schedule = await this.settingsService.getWorkSchedule();
    const { isEarly, earlyMinutes } = calculateEarlyLeave(
      now,
      schedule.workEndTime,
    );

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
      earlyLeaveMinutes: isEarly ? earlyMinutes : 0,
      notes: updatedNotes,
    });

    if (!updated) {
      throw new NotFoundException('Failed to update attendance record.');
    }

    return {
      success: true,
      message: 'Check-out recorded successfully.',
      data: AttendanceItemDto.fromEntity(
        updated,
        schedule.workStartTime,
        schedule.lateToleranceMinutes,
        schedule.workEndTime,
      ),
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

    let collection = this.prisma.client.orm.public.Attendance.where((r) =>
      r.userId.eq(userId),
    );

    if (query.startDate) {
      collection = collection.where((r) => r.date.gte(query.startDate!));
    }
    if (query.endDate) {
      collection = collection.where((r) => r.date.lte(query.endDate!));
    }

    const { total } = await collection.aggregate((agg) => ({
      total: agg.count(),
    }));

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const sortBy = query.sortBy || 'date';

    const records = await collection
      .orderBy([
        (r) => {
          switch (sortBy) {
            case 'lateMinutes':
              return sortOrder === 'asc'
                ? r.lateMinutes.asc()
                : r.lateMinutes.desc();
            case 'earlyLeaveMinutes':
              return sortOrder === 'asc'
                ? r.earlyLeaveMinutes.asc()
                : r.earlyLeaveMinutes.desc();
            case 'checkIn':
              return sortOrder === 'asc'
                ? r.checkIn.asc({ nulls: 'last' })
                : r.checkIn.desc({ nulls: 'last' });
            case 'checkOut':
              return sortOrder === 'asc'
                ? r.checkOut.asc({ nulls: 'last' })
                : r.checkOut.desc({ nulls: 'last' });
            case 'status':
              return sortOrder === 'asc' ? r.status.asc() : r.status.desc();
            case 'date':
            default:
              return sortOrder === 'asc' ? r.date.asc() : r.date.desc();
          }
        },
        (r) => r.id.asc(),
      ])
      .limit(limit)
      .offset(offset)
      .all();

    return createPaginatedResponse(
      records.map((item) => AttendanceItemDto.fromEntity(item)),
      total,
      page,
      limit,
    );
  }

  async getMySummary(
    userId: string,
    query: QueryAttendanceSummaryDto,
  ): Promise<MyAttendanceSummaryResponseDto> {
    let collection = this.prisma.client.orm.public.Attendance.where((r) =>
      r.userId.eq(userId),
    );

    if (query.startDate) {
      collection = collection.where((r) => r.date.gte(query.startDate!));
    }
    if (query.endDate) {
      collection = collection.where((r) => r.date.lte(query.endDate!));
    }

    const [presentAgg, lateAgg, absentAgg, allRecords] = await Promise.all([
      collection
        .where((a) => a.status.eq(AttendanceStatus.PRESENT))
        .aggregate((agg) => ({ count: agg.count() })),
      collection
        .where((a) => a.status.eq(AttendanceStatus.LATE))
        .aggregate((agg) => ({ count: agg.count() })),
      collection
        .where((a) => a.status.eq(AttendanceStatus.ABSENT))
        .aggregate((agg) => ({ count: agg.count() })),
      collection.all(),
    ]);

    const present = presentAgg.count;
    const late = lateAgg.count;
    const absent = absentAgg.count;
    const totalRecords = present + late + absent;

    const lateMinutes = allRecords.reduce(
      (acc, r) => acc + (r.lateMinutes || 0),
      0,
    );
    const earlyLeaveMinutes = allRecords.reduce(
      (acc, r) => acc + (r.earlyLeaveMinutes || 0),
      0,
    );

    const onTimeRate =
      totalRecords > 0
        ? Math.round((present / totalRecords) * 100) + '%'
        : '100%';

    return {
      success: true,
      message: 'Personal attendance summary retrieved successfully',
      data: {
        totalRecords,
        present,
        late,
        absent,
        lateMinutes,
        earlyLeaveMinutes,
        onTimeRate,
      },
    };
  }

  async getAdminOverview(
    query: QueryAdminAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    const { page, limit, offset } = getPaginationParams(query);

    let collection = this.prisma.client.orm.public.Attendance;

    if (query.userId) {
      collection = collection.where((r) => r.userId.eq(query.userId!));
    }
    if (query.status) {
      collection = collection.where((r) => r.status.eq(query.status!));
    }
    if (query.startDate) {
      collection = collection.where((r) => r.date.gte(query.startDate!));
    }
    if (query.endDate) {
      collection = collection.where((r) => r.date.lte(query.endDate!));
    }

    const { total } = await collection.aggregate((agg) => ({
      total: agg.count(),
    }));

    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const sortBy = query.sortBy || 'date';

    const records = await collection
      .include('user')
      .orderBy([
        (r) => {
          switch (sortBy) {
            case 'lateMinutes':
              return sortOrder === 'asc'
                ? r.lateMinutes.asc()
                : r.lateMinutes.desc();
            case 'earlyLeaveMinutes':
              return sortOrder === 'asc'
                ? r.earlyLeaveMinutes.asc()
                : r.earlyLeaveMinutes.desc();
            case 'userName':
              return sortOrder === 'asc'
                ? r.user.name.asc()
                : r.user.name.desc();
            case 'userEmail':
              return sortOrder === 'asc'
                ? r.user.email.asc()
                : r.user.email.desc();
            case 'checkIn':
              return sortOrder === 'asc'
                ? r.checkIn.asc({ nulls: 'last' })
                : r.checkIn.desc({ nulls: 'last' });
            case 'checkOut':
              return sortOrder === 'asc'
                ? r.checkOut.asc({ nulls: 'last' })
                : r.checkOut.desc({ nulls: 'last' });
            case 'status':
              return sortOrder === 'asc' ? r.status.asc() : r.status.desc();
            case 'date':
            default:
              return sortOrder === 'asc' ? r.date.asc() : r.date.desc();
          }
        },
        (r) => r.id.asc(),
      ])
      .limit(limit)
      .offset(offset)
      .all();

    return createPaginatedResponse(
      records.map((item) => AttendanceItemDto.fromEntity(item)),
      total,
      page,
      limit,
    );
  }

  async getSummary(query: QueryAttendanceSummaryDto) {
    let collection = this.prisma.client.orm.public.Attendance;

    if (query.userId) {
      collection = collection.where((a) => a.userId.eq(query.userId!));
    }
    if (query.startDate) {
      collection = collection.where((a) => a.date.gte(query.startDate!));
    }
    if (query.endDate) {
      collection = collection.where((a) => a.date.lte(query.endDate!));
    }

    const [presentAgg, lateAgg, leaveAgg, absentAgg, employeeAgg] =
      await Promise.all([
        collection
          .where((a) => a.status.eq(AttendanceStatus.PRESENT))
          .aggregate((agg) => ({ count: agg.count() })),
        collection
          .where((a) => a.status.eq(AttendanceStatus.LATE))
          .aggregate((agg) => ({ count: agg.count() })),
        collection
          .where((a) => a.status.eq(AttendanceStatus.LEAVE))
          .aggregate((agg) => ({ count: agg.count() })),
        collection
          .where((a) => a.status.eq(AttendanceStatus.ABSENT))
          .aggregate((agg) => ({ count: agg.count() })),
        query.userId
          ? Promise.resolve({ count: 1 })
          : this.prisma.client.orm.public.User.where({
              role: UserRole.EMPLOYEE,
              isActive: true,
            }).aggregate((agg) => ({ count: agg.count() })),
      ]);

    const totalPresent = presentAgg.count;
    const totalLate = lateAgg.count;
    const totalLeave = leaveAgg.count;
    const totalAbsent = absentAgg.count;
    const totalEmployees = employeeAgg.count;

    const attendedCount = totalPresent + totalLate;
    const totalRecords = attendedCount + totalLeave + totalAbsent;

    const isSingleDay = Boolean(
      query.startDate && query.endDate && query.startDate === query.endDate,
    );

    const denominator = isSingleDay ? totalEmployees : totalRecords;

    const ratePercent =
      denominator > 0
        ? Math.min(100, (attendedCount / denominator) * 100).toFixed(1) + '%'
        : '0.0%';

    return {
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: {
        totalEmployees,
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

    const missingCheckOut =
      await this.prisma.client.orm.public.Attendance.where((a) =>
        a.date.eq(dateStr),
      )
        .where((a) => a.checkIn.isNotNull())
        .where((a) => a.checkOut.isNull())
        .where((a) => a.status.neq(AttendanceStatus.ABSENT))
        .all();

    let count = 0;
    for (const record of missingCheckOut) {
      const autoNote = record.notes
        ? `${record.notes} | System: Auto checked-out at end of day (fallback)`
        : 'System: Auto checked-out at end of day (fallback)';

      await this.prisma.client.orm.public.Attendance.where({
        id: record.id,
      }).update({
        checkOut: fallbackCheckOutTime,
        earlyLeaveMinutes: 0,
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

    const absentEmployees = await this.prisma.client.orm.public.User.where({
      role: UserRole.EMPLOYEE,
      isActive: true,
    })
      .where((u) => u.attendances.none((a) => a.date.eq(dateStr)))
      .all();

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
