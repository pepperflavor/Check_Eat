import { Controller } from '@nestjs/common';
import { FoodStorageService } from './food-storage.service';
import { UserStorageService } from './user-storage.service';
import { ReviewStorageService } from './review-storage.service';
import { StoreStorageService } from './store-storage.service';
import { OcrStorageService } from './ocr-storage.service';

@Controller('azure-storage')
export class AzureStorageController {
  constructor(
    private readonly foodStorageService: FoodStorageService,
    private readonly userStorageService: UserStorageService,
    private readonly reviewStorageService: ReviewStorageService,
    private readonly storeStorageService: StoreStorageService,
    private readonly ocrStorageService: OcrStorageService,
  ) {}
}
