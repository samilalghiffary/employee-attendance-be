import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Employee Attendance API')
    .setDescription(
      'REST API Documentation for Employee Attendance Management System',
    )
    .setVersion('1.0.0')
    .addTag('Health Check', 'Application and database connectivity status')
    .addTag(
      'Auth & RBAC',
      'User registration, login, and access authentication',
    )
    .addTag(
      'Attendance',
      'Employee self-service attendance tracking (check-in, check-out, history)',
    )
    .addTag('Users', 'Employee self-service profile and password management')
    .addTag(
      'Admin Attendance',
      'Administrative attendance overview, filtering, and summary metrics',
    )
    .addTag(
      'Admin Users',
      'Administrative user lifecycle management, RBAC, and directory listing',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT Bearer token here',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Employee Attendance API Docs',
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(
    `🚀 Backend NestJS server running on http://localhost:${port}/api`,
  );
  console.log(
    `📖 Swagger documentation available at http://localhost:${port}/api/docs`,
  );
}
await bootstrap();
