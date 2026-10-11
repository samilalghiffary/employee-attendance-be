import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);

    expect(res.body.name).toBe('Employee Attendance API');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.endpoints).toEqual({
      docs: '/api/docs',
      health: '/api/health',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
