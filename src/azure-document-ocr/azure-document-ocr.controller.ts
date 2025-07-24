import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AzureDocumentOcrService } from './azure-document-ocr.service';
import { OcrStorageService } from 'src/azure-storage/ocr-storage.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('azure-document-ocr')
export class AzureDocumentOcrController {
  constructor(
    private readonly ocrService: AzureDocumentOcrService,
    private readonly ocrStorage: OcrStorageService,
  ) {}

  // 📸 사진찍어서 OCR 분석 요청
  @Post('business-analyze')
  @ApiOperation({summary: 'postman 테스트시 form-data에서 file로 보내야함', description: '사업자 등록증 ORC'})
  @UseInterceptors(FileInterceptor('file'))
  async analyzeDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 업로드되지 않았습니다.');
    }

    // ✅ OCR 스토리지에 업로드
    const { url } = await this.ocrStorage.upload(file);

    // ✅ Azure Document Intelligence 분석 요청
    const result = await this.ocrService.analyzeImageUrl(url);

    return result;
  }
}
