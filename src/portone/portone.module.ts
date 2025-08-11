import { Module } from '@nestjs/common';
import { PortoneService } from './portone.service';
import { PortoneController } from './portone.controller';

@Module({
  controllers: [PortoneController],
  providers: [PortoneService],
})
export class PortoneModule {}
