import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Users Module (e2e)', () => {
  let app: INestApplication<App>;
  let employeeToken = '';
  let adminToken = '';
  let employeeId = '';
  let adminId = '';

  const employeeEmail = `e2e.user.emp.${Date.now()}@company.com`;
  const adminEmail = `e2e.user.admin.${Date.now()}@company.com`;
  const initialPassword = 'Password123!';

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

    const empReg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Employee One',
        email: employeeEmail,
        password: initialPassword,
        role: 'EMPLOYEE',
      })
      .expect(201);
    employeeId = empReg.body.user.id;

    const empLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: employeeEmail, password: initialPassword })
      .expect(200);
    employeeToken = empLogin.body.accessToken;

    const adminReg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Admin Boss',
        email: adminEmail,
        password: initialPassword,
        role: 'ADMIN',
      })
      .expect(201);
    adminId = adminReg.body.user.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: initialPassword })
      .expect(200);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/users/profile', () => {
    it('should retrieve authenticated user profile (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(employeeId);
      expect(res.body.data.email).toBe(employeeEmail);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('PATCH /api/users/profile', () => {
    it('should update authenticated user name (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Employee One Updated' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Employee One Updated');
    });
  });

  describe('PATCH /api/users/change-password', () => {
    it('should reject when old password is incorrect (401)', async () => {
      await request(app.getHttpServer())
        .patch('/api/users/change-password')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          oldPassword: 'WrongOldPassword!',
          newPassword: 'NewPassword123!',
        })
        .expect(401);
    });

    it('should change password successfully (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/change-password')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          oldPassword: initialPassword,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should deny employee access with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should allow admin to list users with pagination (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users?limit=10&page=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    it('should allow admin to update employee details (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Employee Edited By Admin',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Employee Edited By Admin');
    });
  });

  describe('PATCH /api/admin/users/:id/status', () => {
    it('should prevent admin from deactivating self (400)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/admin/users/${adminId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(400);
    });

    it('should allow admin to deactivate employee (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${employeeId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: employeeEmail, password: 'NewPassword123!' })
        .expect(401);
    });
  });
});
