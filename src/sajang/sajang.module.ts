import { Module } from '@nestjs/common';
import { SajangService } from './sajang.service';
import { SajangController } from './sajang.controller';

@Module({
  controllers: [SajangController],
  providers: [SajangService],
})
export class SajangModule {}
