import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return API information metadata', () => {
      const info = appController.getApiInfo();
      expect(info.name).toBe('Employee Attendance API');
      expect(info.version).toBe('1.0.0');
      expect(info.endpoints.docs).toBe('/api/docs');
      expect(info.endpoints.health).toBe('/api/health');
    });
  });
});
