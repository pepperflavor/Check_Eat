import { Module } from '@nestjs/common';
import { AzureFoodClassifierService } from './azure-food-classifier.service';
import { AzureFoodClassifierController } from './azure-food-classifier.controller';

@Module({
  controllers: [AzureFoodClassifierController],
  providers: [AzureFoodClassifierService],
  exports: [AzureFoodClassifierService],
})
export class AzureFoodClassifierModule {}
