import { Module } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { SajangController } from './sajang.controller';
import { PrismaService } from 'src/prisma.service';
import { CacheConfigModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';
import { TranslateModule } from 'src/translate/translate.module';
import { BullModule } from '@nestjs/bull';
import { CheckBusinessProcessor } from './processor/check-business.processor';

@Module({
  imports: [
    CacheConfigModule,
    EmailModule,
    TranslateModule,
    BullModule.registerQueue({
      name: 'check-business',
    }),
  ],
  controllers: [SajangController],
  providers: [SajangService, PrismaService, CheckBusinessProcessor],
  exports: [SajangService],
})
export class SajangModule {}
