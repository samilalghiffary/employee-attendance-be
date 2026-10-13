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
          include: vi.fn(),
        },
        User: {
          all: vi.fn(),
          where: vi.fn(),
        },
      },
    },
  };

  const mockSettingsService = {
    getWorkSchedule: vi.fn().mockResolvedValue({
      workStartTime: '08:00',
      workEndTime: '17:00',
      lateToleranceMinutes: 15,
      updatedAt: '2026-10-11T00:00:00.000Z',
    }),
    updateWorkSchedule: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    prismaService = {
      client: mockPrismaClient as any,
    } as unknown as PrismaService;

    attendanceService = new AttendanceService(
      prismaService,
      mockSettingsService as any,
    );
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
          checkIn: '2026-10-11T01:30:00.000Z',
          status: AttendanceStatus.PRESENT,
        }),
      });

      await expect(
        attendanceService.checkIn(userId, {
          notes: 'Pagi lagi',
          latitude: -6.2,
          longitude: 106.8,
        }),
      ).rejects.toThrow('already checked in');
    });

    it('should throw specific ConflictException if attendance is already closed as Absent', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'attendance-absent',
          userId,
          date: '2026-10-11',
          status: AttendanceStatus.ABSENT,
        }),
      });

      await expect(
        attendanceService.checkIn(userId, {
          notes: 'Datang telat banget',
          latitude: -6.2,
          longitude: 106.8,
        }),
      ).rejects.toThrow('closed as Absent');
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
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
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
      expect(result.data.earlyLeaveMinutes).toBeDefined();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          earlyLeaveMinutes: expect.any(Number),
        }),
      );
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
      expect(result.isAbsent).toBe(false);
      expect(result.canCheckIn).toBe(true);
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
      expect(result.isAbsent).toBe(false);
      expect(result.canCheckIn).toBe(false);
      expect(result.data?.id).toBe('attendance-1');
    });

    it('should return isAbsent true and canCheckIn false when marked as ABSENT', async () => {
      mockPrismaClient.orm.public.Attendance.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'attendance-absent',
          userId,
          date: '2026-10-11',
          checkIn: null,
          checkOut: null,
          status: AttendanceStatus.ABSENT,
        }),
      });

      const result = await attendanceService.getTodayStatus(userId);

      expect(result.hasCheckedIn).toBe(false);
      expect(result.hasCheckedOut).toBe(false);
      expect(result.isAbsent).toBe(true);
      expect(result.canCheckIn).toBe(false);
      expect(result.data?.status).toBe(AttendanceStatus.ABSENT);
    });
  });

  describe('getMyHistory', () => {
    const userId = 'user-uuid-123';

    it('should return paginated history filtered by user', async () => {
      const mockChain = {
        where: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue({ total: 2 }),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([
          {
            id: 'attendance-1',
            userId,
            date: '2026-10-11',
            checkIn: '2026-10-11T01:30:00.000Z',
            checkOut: '2026-10-11T10:00:00.000Z',
            status: AttendanceStatus.PRESENT,
            lateMinutes: 0,
          },
          {
            id: 'attendance-2',
            userId,
            date: '2026-10-10',
            checkIn: '2026-10-10T02:30:00.000Z',
            checkOut: '2026-10-10T10:00:00.000Z',
            status: AttendanceStatus.LATE,
            lateMinutes: 15,
          },
        ]),
      };

      mockPrismaClient.orm.public.Attendance.where.mockReturnValue(mockChain);

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
    it('should return all attendance records for admin with user details', async () => {
      const mockChain = {
        where: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue({ total: 2 }),
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([
          {
            id: 'att-1',
            userId: 'user-1',
            date: '2026-10-11',
            status: AttendanceStatus.PRESENT,
            lateMinutes: 0,
            user: {
              id: 'user-1',
              name: 'Budi Santoso',
              email: 'budi@company.com',
            },
          },
          {
            id: 'att-2',
            userId: 'user-2',
            date: '2026-10-11',
            status: AttendanceStatus.LATE,
            lateMinutes: 20,
            user: {
              id: 'user-2',
              name: 'Siti Rahma',
              email: 'siti@company.com',
            },
          },
        ]),
      };

      (mockPrismaClient.orm.public.Attendance as any).where = vi
        .fn()
        .mockReturnValue(mockChain);
      (mockPrismaClient.orm.public.Attendance as any).aggregate = vi
        .fn()
        .mockResolvedValue({ total: 2 });
      (mockPrismaClient.orm.public.Attendance as any).include = vi
        .fn()
        .mockReturnValue(mockChain);

      const result = await attendanceService.getAdminOverview({
        page: 1,
        limit: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
      expect(result.data[0].user).toEqual({
        id: 'user-1',
        name: 'Budi Santoso',
        email: 'budi@company.com',
      });
      expect(result.data[1].user?.name).toBe('Siti Rahma');
    });
  });

  describe('getMySummary', () => {
    it('should aggregate personal attendance metrics correctly', async () => {
      const mockChain: any = {
        where: vi.fn().mockImplementation((condition) => {
          if (typeof condition === 'function') {
            return mockChain;
          }
          return mockChain;
        }),
        aggregate: vi.fn().mockImplementation(() => {
          return Promise.resolve({ count: 5 });
        }),
        all: vi.fn().mockResolvedValue([
          { lateMinutes: 20, earlyLeaveMinutes: 10 },
          { lateMinutes: 15, earlyLeaveMinutes: 0 },
        ]),
      };

      (mockPrismaClient.orm.public.Attendance as any).where = vi
        .fn()
        .mockReturnValue(mockChain);

      const result = await attendanceService.getMySummary('emp-1', {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });

      expect(result.success).toBe(true);
      expect(result.data.lateMinutes).toBe(35);
      expect(result.data.earlyLeaveMinutes).toBe(10);
      expect(result.data.present).toBe(5);
    });
  });

  describe('markDailyAbsents', () => {
    it('should create ABSENT records for employees who have not checked in', async () => {
      const mockUserChain = {
        where: vi.fn().mockReturnThis(),
        all: vi
          .fn()
          .mockResolvedValue([
            { id: 'emp-2', role: 'EMPLOYEE', isActive: true },
          ]),
      };

      mockPrismaClient.orm.public.User.where.mockReturnValue(mockUserChain);

      mockPrismaClient.orm.public.Attendance.create.mockResolvedValue({
        id: 'att-new',
        userId: 'emp-2',
        date: '2026-10-11',
        status: AttendanceStatus.ABSENT,
        lateMinutes: 0,
      });

      const result = await attendanceService.markDailyAbsents('2026-10-11');

      expect(result.count).toBe(1);
      expect(
        mockPrismaClient.orm.public.Attendance.create,
      ).toHaveBeenCalledWith({
        userId: 'emp-2',
        date: '2026-10-11',
        status: AttendanceStatus.ABSENT,
        notes: 'System: Automatically marked as Absent',
      });
    });
  });

  describe('autoCheckOutMissingRecords', () => {
    it('should auto-checkout records with checkIn but no checkOut', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      const mockAttendanceChain = {
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([
          {
            id: 'att-1',
            userId: 'emp-1',
            date: '2026-10-11',
            checkIn: '2026-10-11T01:00:00.000Z',
            checkOut: null,
            status: AttendanceStatus.PRESENT,
            notes: 'Pagi',
            lateMinutes: 0,
          },
        ]),
        update: mockUpdate,
      };

      mockPrismaClient.orm.public.Attendance.where.mockReturnValue(
        mockAttendanceChain,
      );

      const result =
        await attendanceService.autoCheckOutMissingRecords('2026-10-11');

      expect(result.count).toBe(1);
      expect(result.date).toBe('2026-10-11');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Pagi | System: Auto checked-out at end of day (fallback)',
        }),
      );
    });
  });
});
