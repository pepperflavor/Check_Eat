import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AzureFoodClassifierService } from './azure-food-classifier.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('azure-food-classifier')
export class AzureFoodClassifierController {
  constructor(
    private readonly azureFoodClassifierService: AzureFoodClassifierService,
  ) {}

  // 음식명 추론 - 애저
  @Post('predict')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 5 * 1024 * 1024 }, 
  }))
  async predict(@UploadedFile() file: Express.Multer.File) {
    return this.azureFoodClassifierService.predictFromAllModels(file);
  }
}
