import { Module } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { SajangController } from './sajang.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [SajangController],
  providers: [SajangService, PrismaService],
  exports: [SajangService],
})
export class SajangModule {}
