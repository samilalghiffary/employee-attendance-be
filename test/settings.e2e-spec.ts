import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma.service.js';

describe('Settings Module (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken = '';
  let employeeToken = '';
  let adminEmail = '';
  let employeeEmail = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    const rand = Math.random().toString(36).substring(7);
    adminEmail = `admin_settings_${rand}@test.com`;
    employeeEmail = `employee_settings_${rand}@test.com`;
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Admin Settings Tester',
        email: adminEmail,
        password,
        role: 'ADMIN',
      })
      .expect(201);

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: adminEmail,
        password,
      })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Employee Settings Tester',
        email: employeeEmail,
        password,
        role: 'EMPLOYEE',
      })
      .expect(201);

    const empLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: employeeEmail,
        password,
      })
      .expect(200);
    employeeToken = empLogin.body.accessToken;
  });

  afterAll(async () => {
    try {
      const prismaService = app.get(PrismaService);
      await prismaService.client.orm.public.User.where({
        email: adminEmail,
      }).delete();
      await prismaService.client.orm.public.User.where({
        email: employeeEmail,
      }).delete();
      await prismaService.client.orm.public.SystemSetting.where({
        key: 'DEFAULT_SCHEDULE',
      }).update({
        workStartTime: '08:00',
        workEndTime: '17:00',
        lateToleranceMinutes: 15,
      });
    } catch {
      // ignore cleanup errors
    }
    await app.close();
  });

  describe('GET /api/settings/work-schedule', () => {
    it('should allow authenticated employee to view current work schedule policy (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings/work-schedule')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('workStartTime');
      expect(res.body.data).toHaveProperty('workEndTime');
      expect(res.body.data).toHaveProperty('lateToleranceMinutes');
    });

    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/settings/work-schedule')
        .expect(401);
    });
  });

  describe('PATCH /api/admin/settings/work-schedule', () => {
    it('should allow admin to update work schedule policy (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/settings/work-schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workStartTime: '08:30',
          workEndTime: '17:30',
          lateToleranceMinutes: 20,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.workStartTime).toBe('08:30');
      expect(res.body.data.workEndTime).toBe('17:30');
      expect(res.body.data.lateToleranceMinutes).toBe(20);
    });

    it('should reject non-admin employee with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/settings/work-schedule')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          workStartTime: '09:00',
        })
        .expect(403);
    });

    it('should validate invalid time format with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/settings/work-schedule')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          workStartTime: '8:00', // Invalid, must be HH:mm
        })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });
});
