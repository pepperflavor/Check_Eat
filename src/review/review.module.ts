import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PrismaService } from 'src/prisma.service';
import { AzureStorageModule } from '../azure-storage/azure-storage.module';
import { TranslateModule } from 'src/translate/translate.module';
import { ReviewStorageService } from 'src/azure-storage/review-storage.service';

@Module({
  imports: [AzureStorageModule, TranslateModule],
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService, ReviewStorageService],
  exports: [ReviewService],
})
export class ReviewModule {}
