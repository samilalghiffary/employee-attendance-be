import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Settings Module (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken = '';
  let employeeToken = '';

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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@acme.com',
        password: 'Admin123!',
      })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    const empLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'employee@acme.com',
        password: 'Employee123!',
      })
      .expect(200);
    employeeToken = empLogin.body.accessToken;
  });

  afterAll(async () => {
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
