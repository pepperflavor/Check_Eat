import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ErrorCode } from './common/errors/error-codes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Check EAT! API')
    .setDescription('The Check EAT API description')
    .setVersion('1.0')
    .addTag('summer')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  const isProd = process.env.NODE_ENV === 'production';

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors) => {
        if (isProd) {
          return new HttpException(
            {
              code: ErrorCode.UNPROCESSABLE_ENTITY,
              message: '요청 데이터가 유효하지 않습니다.',
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }

        const message = errors.map((e) => ({
          field: e.property,
          constraints: e.constraints,
        }));
        return new HttpException(
          {
            code: ErrorCode.UNPROCESSABLE_ENTITY,
            message: '요청 데이터가 유효하지 않습니다.',
            detail: message,
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      },
    }),
  );

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:4200',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  await app.listen(3000);


  if (process.send) {
    process.send('ready');
  }
}
bootstrap();
