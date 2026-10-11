import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

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
      expect(res.body.data.notes).toBe('First check-in today');
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

  describe('GET /api/admin/attendance/overview', () => {
    it('should deny access to regular employee with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/attendance/overview')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should allow access to admin with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/attendance/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toHaveProperty('total');
    });
  });
});
