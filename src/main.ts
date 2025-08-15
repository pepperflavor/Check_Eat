import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Check EAT! API')
    .setDescription('The Check EAT API description')
    .setVersion('1.0')
    .addTag('summer')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의된 속성만 허용
      forbidNonWhitelisted: true, // 정의되지 않은 속성이 오면 에러
      transform: true, // Transform 데코레이터 작동
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',    // React 개발 서버
      'http://localhost:5173',    // Vite 개발 서버
      'http://localhost:8080',    // Vue CLI 개발 서버
      'http://localhost:4200',    // Angular 개발 서버
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:4200',
      // 추후 프로덕션 프론트엔드 URL 추가
      // 'https://your-frontend-domain.com'
    ],
    credentials: true,  // 쿠키/인증 정보 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  await app.listen(3000);

  // 👇 PM2 클러스터 모드에서 "ready" 신호 보내기
  if (process.send) {
    process.send('ready');
  }
}
bootstrap();
