import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AzureDocumentOcrService } from './azure-document-ocr.service';
import { OcrStorageService } from 'src/azure-storage/ocr-storage.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { AnalyzeReceiptResponseDto } from './types/receipt-type';

@Controller('azure-document-ocr')
export class AzureDocumentOcrController {
  constructor(
    private readonly ocrService: AzureDocumentOcrService,
    private readonly ocrStorage: OcrStorageService,
  ) {}

  // 사진찍어서 OCR 분석 요청
  @Post('business-analyze')
  @ApiOperation({
    summary: 'postman 테스트시 form-data에서 file로 보내야함',
    description: '사업자 등록증 ORC',
  })
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

  @Post('receipt')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: '영수증 분석 OCR',
    description: '영수증 분석 OCR-사진 한장만 보내야함',
  })
  @ApiOkResponse({
    description: '리턴 형식',
    type: AnalyzeReceiptResponseDto
  })
  async analyzeReceipt(@UploadedFile() file: Express.Multer.File) {
    return await this.ocrService.analyzeReceiptFromBuffer(
      file.buffer,
      file.mimetype,
    );
  }
}
