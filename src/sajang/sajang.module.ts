import { Module } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { SajangController } from './sajang.controller';
import { PrismaService } from 'src/prisma.service';
import { CacheConfigModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';
import { TranslateModule } from 'src/translate/translate.module';

@Module({
  imports: [CacheConfigModule, EmailModule, TranslateModule],
  controllers: [SajangController],
  providers: [SajangService, PrismaService],
  exports: [SajangService],
})
export class SajangModule {}
