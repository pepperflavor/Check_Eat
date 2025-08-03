import { Module } from '@nestjs/common';
import { AzureStorageController } from './azure-storage.controller';
import { OcrStorageService } from './ocr-storage.service';
import { FoodStorageService } from './food-storage.service';
import { UserStorageService } from './user-storage.service';
import { ReviewStorageService } from './review-storage.service';
import { StoreStorageService } from './store-storage.service';

@Module({
  controllers: [AzureStorageController],
  providers: [
    OcrStorageService,
    FoodStorageService,
    UserStorageService,
    ReviewStorageService,
    StoreStorageService,
  ],
  exports: [
    OcrStorageService,
    FoodStorageService,
    UserStorageService,
    ReviewStorageService,
    StoreStorageService,
  ],
})
export class AzureStorageModule {}
