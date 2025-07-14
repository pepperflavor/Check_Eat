import { Module } from '@nestjs/common';
import { CommonAccountService } from './common-account.service';
import { CommonAccountController } from './common-account.controller';
import { PrismaService } from 'src/prisma.service';
import { CacheConfigModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [CacheConfigModule, EmailModule],
  controllers: [CommonAccountController],
  providers: [CommonAccountService, PrismaService],
  exports: [CommonAccountService],
})
export class CommonAccountModule {}
