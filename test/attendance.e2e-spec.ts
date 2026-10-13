import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma.service.js';

describe('Attendance Module (e2e)', () => {
  let app: INestApplication<App>;
  let employeeToken = '';
  let adminToken = '';

  const employeeEmail = `e2e.emp.${Date.now()}@company.com`;
  const adminEmail = `e2e.admin.${Date.now()}@company.com`;
  const password = 'Password123!';

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

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Employee Tester',
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

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Admin Tester',
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
  });

  afterAll(async () => {
    try {
      const prismaService = app.get(PrismaService);
      const empUser = await prismaService.client.orm.public.User.where({
        email: employeeEmail,
      }).first();
      if (empUser) {
        await prismaService.client.orm.public.Attendance.where({
          userId: empUser.id,
        }).delete();
        await prismaService.client.orm.public.User.where({
          id: empUser.id,
        }).delete();
      }

      const adminUser = await prismaService.client.orm.public.User.where({
        email: adminEmail,
      }).first();
      if (adminUser) {
        await prismaService.client.orm.public.Attendance.where({
          userId: adminUser.id,
        }).delete();
        await prismaService.client.orm.public.User.where({
          id: adminUser.id,
        }).delete();
      }
    } catch {
      // ignore cleanup errors
    }
    await app.close();
  });

  describe('GET /api/attendance/today', () => {
    it('should return hasCheckedIn: false initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance/today')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.hasCheckedIn).toBe(false);
      expect(res.body.hasCheckedOut).toBe(false);
      expect(res.body.isAbsent).toBe(false);
      expect(res.body.canCheckIn).toBe(true);
      expect(res.body.data).toBeNull();
    });

    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/attendance/today')
        .expect(401);
    });
  });

  describe('POST /api/attendance/check-in', () => {
    it('should successfully check in for today (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'First check-in today',
          latitude: -6.2088,
          longitude: 106.8456,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.checkIn).toBeDefined();
      expect(res.body.data.checkInLat).toBe(-6.2088);
      expect(res.body.data.checkInLng).toBe(106.8456);
      expect(res.body.data.lateMinutes).toBeDefined();
      expect(res.body.data.notes).toBe('Checkin: First check-in today');
    });

    it('should reject check-in if latitude or longitude is missing (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ notes: 'No GPS' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should prevent double check-in on the same day (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'Trying again',
          latitude: -6.2088,
          longitude: 106.8456,
        })
        .expect(409);

      expect(res.body.message).toContain('already checked in');
    });
  });

  describe('POST /api/attendance/check-out', () => {
    it('should successfully check out after check-in (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'Finishing shift',
          latitude: -6.2089,
          longitude: 106.8457,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.checkOut).toBeDefined();
      expect(res.body.data.checkOutLat).toBe(-6.2089);
      expect(res.body.data.checkOutLng).toBe(106.8457);
    });

    it('should reject check-out if latitude or longitude is missing (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ notes: 'No GPS checkout' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should prevent duplicate check-out on the same day (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          notes: 'Checkout again',
          latitude: -6.2089,
          longitude: 106.8457,
        })
        .expect(409);

      expect(res.body.message).toContain('already checked out');
    });
  });

  describe('GET /api/attendance/my-history', () => {
    it('should return attendance history for the authenticated employee', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance/my-history')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
    });
  });

  describe('GET /api/attendance/my-summary', () => {
    it('should return personal aggregate summary metrics for the authenticated employee (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/attendance/my-summary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalRecords');
      expect(res.body.data).toHaveProperty('present');
      expect(res.body.data).toHaveProperty('late');
      expect(res.body.data).toHaveProperty('absent');
      expect(res.body.data).toHaveProperty('lateMinutes');
      expect(res.body.data).toHaveProperty('earlyLeaveMinutes');
      expect(res.body.data).toHaveProperty('onTimeRate');
    });

    it('should filter summary by date range', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/attendance/my-summary?startDate=2026-10-01&endDate=2026-10-31',
        )
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalRecords).toBe('number');
    });
  });

  describe('GET /api/admin/attendance/overview', () => {
    it('should deny access to regular employee with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/attendance/overview')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should allow access to admin with 200 OK and return enriched user details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/attendance/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('user');
        expect(res.body.data[0].user).toHaveProperty('name');
        expect(res.body.data[0].user).toHaveProperty('email');
      }
    });
  });

  describe('GET /api/admin/attendance/summary', () => {
    it('should deny regular employee with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/attendance/summary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should allow admin to retrieve summary metrics with optional date filters (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/api/admin/attendance/summary?startDate=2026-10-01&endDate=2026-10-31',
        )
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalEmployees');
      expect(res.body.data).toHaveProperty('totalPresent');
      expect(res.body.data).toHaveProperty('totalLate');
      expect(res.body.data).toHaveProperty('totalAbsent');
      expect(res.body.data).toHaveProperty('attendanceRate');
    });

    it('should allow admin to filter summary metrics by specific employee userId (200)', async () => {
      const overviewRes = await request(app.getHttpServer())
        .get('/api/admin/attendance/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const targetUserId = overviewRes.body.data[0]?.userId;
      if (targetUserId) {
        const res = await request(app.getHttpServer())
          .get(
            `/api/admin/attendance/summary?userId=${targetUserId}&startDate=2026-10-01&endDate=2026-10-31`,
          )
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.totalEmployees).toBe(1);
      }
    });

    it('should reject invalid date string query with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/attendance/summary?startDate=invalid-date')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('DELETE /api/admin/attendance/:id', () => {
    it('should deny regular employee with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .delete('/api/admin/attendance/some-id')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return 404 if record to delete is not found', async () => {
      await request(app.getHttpServer())
        .delete('/api/admin/attendance/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should allow admin to delete attendance record successfully', async () => {
      const overview = await request(app.getHttpServer())
        .get('/api/admin/attendance/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (overview.body.data.length > 0) {
        const targetId = overview.body.data[0].id;
        const res = await request(app.getHttpServer())
          .delete(`/api/admin/attendance/${targetId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('deleted');
      }
    });
  });
});
