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

@Module({
  imports: [
    CacheConfigModule,
    EmailModule,
    TranslateModule,
    AzureStorageModule,
    BullModule.registerQueue({
      name: 'check-business',
    }),
  ],
  controllers: [SajangController],
  providers: [SajangService, PrismaService, CheckBusinessProcessor],
  exports: [SajangService],
})
export class SajangModule {}
