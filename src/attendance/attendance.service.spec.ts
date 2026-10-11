import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceStatus } from '../common/enums/attendance-status.enum.js';
import { PrismaService } from '../prisma.service.js';
import { AttendanceService } from './attendance.service.js';

describe('AttendanceService', () => {
  let attendanceService: AttendanceService;
  let prismaService: PrismaService;

  const mockPrismaClient = {
    orm: {
      public: {
        Attendance: {
          where: vi.fn(),
          create: vi.fn(),
          all: vi.fn(),
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    prismaService = {
      client: mockPrismaClient as any,
    } as unknown as PrismaService;

    attendanceService = new AttendanceService(prismaService);
  });

  describe('checkIn', () => {
    const userId = 'user-uuid-123';

    it('should successfully check in when user has not checked in today', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      mockPrismaClient.orm.public.Attendance.create.mockResolvedValue({
        id: 'attendance-1',
        userId,
        date: '2026-10-11',
        checkIn: '2026-10-11T01:30:00.000Z',
        checkOut: null,
        status: AttendanceStatus.PRESENT,
        notes: 'Pagi',
        createdAt: '2026-10-11T01:30:00.000Z',
      });

      const result = await attendanceService.checkIn(userId, {
        notes: 'Pagi',
        latitude: -6.2,
        longitude: 106.8,
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('attendance-1');
      expect(mockPrismaClient.orm.public.Attendance.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already checked in today', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          userId,
          date: '2026-10-11',
        }),
      });

      await expect(
        attendanceService.checkIn(userId, {
          notes: 'Pagi lagi',
          latitude: -6.2,
          longitude: 106.8,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('checkOut', () => {
    const userId = 'user-uuid-123';

    it('should throw BadRequestException if user has not checked in today', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      await expect(
        attendanceService.checkOut(userId, {
          latitude: -6.2,
          longitude: 106.8,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user has already checked out', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          userId,
          checkIn: '2026-10-11T01:30:00.000Z',
          checkOut: '2026-10-11T10:00:00.000Z',
        }),
      });

      await expect(
        attendanceService.checkOut(userId, {
          latitude: -6.2,
          longitude: 106.8,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully check out', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          userId,
          checkIn: '2026-10-11T01:30:00.000Z',
          checkOut: null,
          notes: 'Datang pagi',
        }),
      });

      const updateMock = vi.fn().mockResolvedValue({
        id: 'attendance-1',
        userId,
        date: '2026-10-11',
        checkIn: '2026-10-11T01:30:00.000Z',
        checkOut: '2026-10-11T10:00:00.000Z',
        status: AttendanceStatus.PRESENT,
        notes: 'Datang pagi | Checkout: Selesai shift',
        createdAt: '2026-10-11T01:30:00.000Z',
      });

      mockPrismaClient.orm.public.Attendance.where.mockReturnValueOnce({
        update: updateMock,
      });

      const result = await attendanceService.checkOut(userId, {
        notes: 'Selesai shift',
        latitude: -6.2,
        longitude: 106.8,
      });

      expect(result.success).toBe(true);
      expect(result.data.checkOut).toBeDefined();
    });
  });

  describe('getTodayStatus', () => {
    const userId = 'user-uuid-123';

    it('should return null data when not checked in yet', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      const result = await attendanceService.getTodayStatus(userId);

      expect(result.success).toBe(true);
      expect(result.hasCheckedIn).toBe(false);
      expect(result.hasCheckedOut).toBe(false);
      expect(result.data).toBeNull();
    });

    it('should return status correctly when checked in', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          userId,
          date: '2026-10-11',
          checkIn: '2026-10-11T01:30:00.000Z',
          checkOut: null,
          status: AttendanceStatus.PRESENT,
        }),
      });

      const result = await attendanceService.getTodayStatus(userId);

      expect(result.hasCheckedIn).toBe(true);
      expect(result.hasCheckedOut).toBe(false);
      expect(result.data?.id).toBe('attendance-1');
    });
  });

  describe('getMyHistory', () => {
    const userId = 'user-uuid-123';

    it('should return paginated history filtered by user', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        all: vi.fn().mockResolvedValue([
          {
            id: 'attendance-1',
            userId,
            date: '2026-10-11',
            checkIn: '2026-10-11T01:30:00.000Z',
            checkOut: '2026-10-11T10:00:00.000Z',
            status: AttendanceStatus.PRESENT,
          },
          {
            id: 'attendance-2',
            userId,
            date: '2026-10-10',
            checkIn: '2026-10-10T02:30:00.000Z',
            checkOut: '2026-10-10T10:00:00.000Z',
            status: AttendanceStatus.LATE,
          },
        ]),
      });

      const result = await attendanceService.getMyHistory(userId, {
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('getAdminOverview', () => {
    it('should return all attendance records for admin', async () => {
      mockPrismaClient.orm.public.Attendance.all.mockResolvedValue([
        {
          id: 'att-1',
          userId: 'user-1',
          date: '2026-10-11',
          status: AttendanceStatus.PRESENT,
        },
        {
          id: 'att-2',
          userId: 'user-2',
          date: '2026-10-11',
          status: AttendanceStatus.LATE,
        },
      ]);

      const result = await attendanceService.getAdminOverview({
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
