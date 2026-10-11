import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma.service.js';
import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let prismaService: PrismaService;

  const mockPrismaClient = {
    orm: {
      public: {
        SystemSetting: {
          where: vi.fn(),
          create: vi.fn(),
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    prismaService = {
      client: mockPrismaClient as any,
    } as unknown as PrismaService;

    settingsService = new SettingsService(prismaService);
  });

  describe('getWorkSchedule', () => {
    it('should return existing setting if present', async () => {
      mockPrismaClient.orm.public.SystemSetting.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'setting-1',
          key: 'DEFAULT_SCHEDULE',
          workStartTime: '08:30',
          workEndTime: '17:30',
          lateToleranceMinutes: 20,
          updatedAt: '2026-10-11T00:00:00.000Z',
        }),
      });

      const res = await settingsService.getWorkSchedule();

      expect(res.workStartTime).toBe('08:30');
      expect(res.workEndTime).toBe('17:30');
      expect(res.lateToleranceMinutes).toBe(20);
    });

    it('should fallback create default schedule if not found', async () => {
      mockPrismaClient.orm.public.SystemSetting.where.mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      });

      mockPrismaClient.orm.public.SystemSetting.create.mockResolvedValue({
        id: 'new-setting',
        key: 'DEFAULT_SCHEDULE',
        workStartTime: '08:00',
        workEndTime: '17:00',
        lateToleranceMinutes: 15,
        updatedAt: '2026-10-11T00:00:00.000Z',
      });

      const res = await settingsService.getWorkSchedule();

      expect(res.workStartTime).toBe('08:00');
      expect(res.workEndTime).toBe('17:00');
      expect(res.lateToleranceMinutes).toBe(15);
    });
  });

  describe('updateWorkSchedule', () => {
    it('should update work schedule settings', async () => {
      mockPrismaClient.orm.public.SystemSetting.where.mockReturnValue({
        first: vi.fn().mockResolvedValue({
          workStartTime: '08:00',
          workEndTime: '17:00',
          lateToleranceMinutes: 15,
          updatedAt: '2026-10-11T00:00:00.000Z',
        }),
        update: vi.fn().mockResolvedValue({
          workStartTime: '09:00',
          workEndTime: '18:00',
          lateToleranceMinutes: 10,
          updatedAt: '2026-10-11T02:00:00.000Z',
        }),
      });

      const res = await settingsService.updateWorkSchedule({
        workStartTime: '09:00',
        workEndTime: '18:00',
        lateToleranceMinutes: 10,
      });

      expect(res.workStartTime).toBe('09:00');
      expect(res.workEndTime).toBe('18:00');
      expect(res.lateToleranceMinutes).toBe(10);
    });
  });
});
