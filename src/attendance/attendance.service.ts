import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { AttendanceStatus } from '../common/enums/attendance-status.enum.js';
import {
  getLocalDateString,
  isAfterThresholdTime,
} from '../common/utils/date.util.js';
import { createPaginatedResponse } from '../common/utils/pagination.util.js';
import { PrismaService } from '../prisma.service.js';
import type {
  AttendanceItemDto,
  AttendanceResponseDto,
  PaginatedAttendanceResponseDto,
  TodayAttendanceResponseDto,
} from './dto/attendance-response.dto.js';
import type { CheckInDto } from './dto/check-in.dto.js';
import type { CheckOutDto } from './dto/check-out.dto.js';
import type {
  QueryAdminAttendanceDto,
  QueryAttendanceDto,
} from './dto/query-attendance.dto.js';

@Injectable()
export class AttendanceService {
  private readonly LATE_THRESHOLD_HOUR = 9;
  private readonly LATE_THRESHOLD_MINUTE = 0;

  constructor(private readonly prisma: PrismaService) {}

  async checkIn(
    userId: string,
    dto: CheckInDto,
  ): Promise<AttendanceResponseDto> {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    const existing = await this.prisma.client.orm.public.Attendance.where({
      userId,
      date: todayStr,
    }).first();

    if (existing) {
      throw new ConflictException('You have already checked in for today.');
    }

    const status = isAfterThresholdTime(
      now,
      this.LATE_THRESHOLD_HOUR,
      this.LATE_THRESHOLD_MINUTE,
    )
      ? AttendanceStatus.LATE
      : AttendanceStatus.PRESENT;

    const record = await this.prisma.client.orm.public.Attendance.create({
      userId,
      date: todayStr,
      checkIn: now.toISOString(),
      status,
      notes: dto.notes ?? null,
    });

    return {
      success: true,
      message:
        status === AttendanceStatus.LATE
          ? 'Check-in recorded successfully (Late).'
          : 'Check-in recorded successfully (On Time).',
      data: this.mapToItemDto(record),
    };
  }

  async checkOut(
    userId: string,
    dto: CheckOutDto,
  ): Promise<AttendanceResponseDto> {
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

    const updatedNotes = dto.notes
      ? existing.notes
        ? `${existing.notes} | Checkout: ${dto.notes}`
        : dto.notes
      : existing.notes;

    const updated = await this.prisma.client.orm.public.Attendance.where({
      id: existing.id,
    }).update({
      checkOut: now.toISOString(),
      notes: updatedNotes,
    });

    return {
      success: true,
      message: 'Check-out recorded successfully.',
      data: this.mapToItemDto(updated),
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
        data: null,
      };
    }

    return {
      success: true,
      hasCheckedIn: !!record.checkIn,
      hasCheckedOut: !!record.checkOut,
      data: this.mapToItemDto(record),
    };
  }

  async getMyHistory(
    userId: string,
    query: QueryAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const allUserRecords = await this.prisma.client.orm.public.Attendance.where(
      {
        userId,
      },
    ).all();

    let filtered = allUserRecords;

    if (query.startDate) {
      filtered = filtered.filter((item) => item.date >= query.startDate!);
    }
    if (query.endDate) {
      filtered = filtered.filter((item) => item.date <= query.endDate!);
    }

    filtered.sort((a, b) => (b.date > a.date ? 1 : -1));

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return createPaginatedResponse(
      paginated.map((item) => this.mapToItemDto(item)),
      total,
      page,
      limit,
    );
  }

  async getAdminOverview(
    query: QueryAdminAttendanceDto,
  ): Promise<PaginatedAttendanceResponseDto> {
    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const allRecords = await this.prisma.client.orm.public.Attendance.all();

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

    filtered.sort((a, b) => (b.date > a.date ? 1 : -1));

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return createPaginatedResponse(
      paginated.map((item) => this.mapToItemDto(item)),
      total,
      page,
      limit,
    );
  }

  async getSummary(query: { startDate?: string; endDate?: string }) {
    const allUsers = await this.prisma.client.orm.public.User.all();
    const activeEmployees = allUsers.filter(
      (u) => u.role === 'EMPLOYEE' && u.isActive,
    );

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
        attendanceRate: ratePercent,
      },
    };
  }

  private mapToItemDto(record: any): AttendanceItemDto {
    return {
      id: record.id,
      userId: record.userId,
      date: record.date,
      checkIn: record.checkIn ?? null,
      checkOut: record.checkOut ?? null,
      status: record.status as AttendanceStatus,
      notes: record.notes ?? null,
      createdAt: record.createdAt,
    };
  }
}
