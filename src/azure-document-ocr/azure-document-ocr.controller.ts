import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AzureDocumentOcrService } from './azure-document-ocr.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('azure-document-ocr')
export class AzureDocumentOcrController {
  constructor(private readonly azureDocumentOcrService: AzureDocumentOcrService) {}

  @Post('business-ocr')
  async analyzeUpload(){

  }
}
