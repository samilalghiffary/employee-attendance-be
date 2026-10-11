import { Injectable } from '@nestjs/common';

export interface ApiInfoResponse {
  name: string;
  version: string;
  description: string;
  environment: string;
  endpoints: {
    docs: string;
    health: string;
  };
}

@Injectable()
export class AppService {
  getApiInfo(): ApiInfoResponse {
    return {
      name: 'Employee Attendance API',
      version: '1.0.0',
      description:
        'Production-ready backend API for Employee Attendance Management System',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        docs: '/api/docs',
        health: '/api/health',
      },
    };
  }
}
