import { Module } from '@nestjs/common';
import { AzureStorageService } from './azure-storage.service';
import { AzureStorageController } from './azure-storage.controller';
import { OcrStorageService } from './ocr-storage.service';
import { FoodStorageService } from './food-storage.service';

@Module({
  controllers: [AzureStorageController],
  providers: [AzureStorageService, OcrStorageService, FoodStorageService],
  exports: [AzureStorageService, OcrStorageService, FoodStorageService],
})
export class AzureStorageModule {}
