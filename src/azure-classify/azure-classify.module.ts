import { Module } from '@nestjs/common';
import { AzureClassifyService } from './azure-classify.service';
import { AzureClassifyController } from './azure-classify.controller';

@Module({
  controllers: [AzureClassifyController],
  providers: [AzureClassifyService],
  exports: [AzureClassifyService],
})
export class AzureClassifyModule {}
