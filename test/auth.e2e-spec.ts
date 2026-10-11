import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('Auth Module (e2e)', () => {
  let app: INestApplication<App>;
  const testEmail = `test.e2e.${Date.now()}@company.com`;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'E2E Tester',
          email: testEmail,
          password: 'Password123!',
          role: 'EMPLOYEE',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User successfully registered');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe('EMPLOYEE');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 400 Bad Request when password is shorter than 6 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Short Pass User',
          email: 'shortpass@company.com',
          password: '123',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'password must be longer than or equal to 6 characters',
          ),
        ]),
      );
    });

    it('should return 400 Bad Request when email format is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'invalid-email-format',
          password: 'ValidPassword123!',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('email must be an email'),
        ]),
      );
    });

    it('should return 409 Conflict when email is already registered', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: testEmail,
          password: 'Password123!',
        })
        .expect(409);

      expect(res.body.message).toContain('is already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return JWT access token (200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user.email).toBe(testEmail);
    });

    it('should return 401 Unauthorized when password is wrong', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 401 Unauthorized when email does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@company.com',
          password: 'Password123!',
        })
        .expect(401);

      expect(res.body.message).toBe('Invalid email or password');
    });
  });
});
