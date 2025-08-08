import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheConfigModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CrawlingModule } from './crawling/crawling.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { EmailModule } from './email/email.module';
import { AzureStorageModule } from './azure-storage/azure-storage.module';
import { SajangModule } from './sajang/sajang.module';

import { CommonAccountModule } from './common-account/common-account.module';
import { TranslateModule } from './translate/translate.module';
import { AzureDocumentOcrModule } from './azure-document-ocr/azure-document-ocr.module';
import { ReviewModule } from './review/review.module';
import { FoodSeedModule } from './food-seed/food-seed.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AzureFoodClassifierModule } from './azure-food-classifier/azure-food-classifier.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    CrawlingModule,
    CacheConfigModule,
    EmailModule,
    AzureStorageModule,
    SajangModule,

    CommonAccountModule,
    TranslateModule,
    AzureDocumentOcrModule,
    ReviewModule,
    FoodSeedModule,
    ScheduleModule.forRoot(),

    AzureFoodClassifierModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
