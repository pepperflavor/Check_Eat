import { Module } from '@nestjs/common';
import { AzureDocumentOcrService } from './azure-document-ocr.service';
import { AzureDocumentOcrController } from './azure-document-ocr.controller';

@Module({
  controllers: [AzureDocumentOcrController],
  providers: [AzureDocumentOcrService],
})
export class AzureDocumentOcrModule {}
