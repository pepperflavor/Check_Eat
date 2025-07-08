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

  app.enableCors();
  await app.listen(3000);

  // 👇 PM2 클러스터 모드에서 "ready" 신호 보내기
  if (process.send) {
    process.send('ready');
  }
}
bootstrap();
