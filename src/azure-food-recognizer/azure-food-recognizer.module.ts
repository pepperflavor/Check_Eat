import { Module } from '@nestjs/common';
import { AzureFoodRecognizerService } from './azure-food-recognizer.service';
import { AzureFoodRecognizerController } from './azure-food-recognizer.controller';
import { AzureFoodClassifierService } from 'src/azure-food-classifier/azure-food-classifier.service';
import { FoodStorageService } from 'src/azure-storage/food-storage.service';
import { CacheService } from 'src/cache/cache.service';
import { TranslateService } from 'src/translate/translate.service';
import { PrismaService } from 'src/prisma.service';
import { AzureFoodClassifierModule } from 'src/azure-food-classifier/azure-food-classifier.module';
import { BullModule } from '@nestjs/bull';
//  BullModule.registerQueue({ name: 'check-business' }),
@Module({
  imports: [
    AzureFoodClassifierModule,
    BullModule.registerQueue({ name: 'food-pipeline' }),
  ],
  controllers: [AzureFoodRecognizerController],
  providers: [
    AzureFoodRecognizerService,
    AzureFoodClassifierService,
    FoodStorageService,
    CacheService,
    TranslateService,
    PrismaService,
  ],
  exports: [AzureFoodRecognizerService],
})
export class AzureFoodRecognizerModule {}
