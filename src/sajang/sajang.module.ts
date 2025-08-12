import { Module } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { SajangController } from './sajang.controller';
import { PrismaService } from 'src/prisma.service';
import { CacheConfigModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';
import { TranslateModule } from 'src/translate/translate.module';
import { BullModule } from '@nestjs/bull';
import { CheckBusinessProcessor } from './processor/check-business.processor';
import { AzureStorageModule } from 'src/azure-storage/azure-storage.module';
import { TranslateService } from 'src/translate/translate.service';
import { AzureFoodRecognizerService } from 'src/azure-food-recognizer/azure-food-recognizer.service';
import { AzureFoodRecognizerModule } from 'src/azure-food-recognizer/azure-food-recognizer.module';
import { AzureFoodClassifierService } from 'src/azure-food-classifier/azure-food-classifier.service';

@Module({
  imports: [
    CacheConfigModule,
    EmailModule,
    TranslateModule,
    AzureStorageModule,
    AzureFoodRecognizerModule,
    BullModule.registerQueue({
      name: 'check-business',
    }),
  ],
  controllers: [SajangController],
  providers: [
    SajangService,
    PrismaService,
    CheckBusinessProcessor,
    TranslateService,
    AzureFoodRecognizerService,
    AzureFoodClassifierService,
  ],
  exports: [SajangService],
})
export class SajangModule {}
