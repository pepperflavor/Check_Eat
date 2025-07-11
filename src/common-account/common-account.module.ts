import { Module } from '@nestjs/common';
import { CommonAccountService } from './common-account.service';
import { CommonAccountController } from './common-account.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [CommonAccountController],
  providers: [CommonAccountService, PrismaService],
  exports: [CommonAccountService],
})
export class CommonAccountModule {}
