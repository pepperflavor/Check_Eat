import { Module } from '@nestjs/common';
import { AzureDocumentOcrService } from './azure-document-ocr.service';
import { AzureDocumentOcrController } from './azure-document-ocr.controller';
import { PrismaService } from 'src/prisma.service';
import { AzureStorageModule } from 'src/azure-storage/azure-storage.module';

@Module({
  imports: [AzureStorageModule],
  controllers: [AzureDocumentOcrController],
  providers: [AzureDocumentOcrService, PrismaService],
})
export class AzureDocumentOcrModule {}
