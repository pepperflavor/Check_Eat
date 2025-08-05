import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AzureClassifyService } from './azure-classify.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('azure-classify')
export class AzureClassifyController {
  constructor(private readonly azureClassifyService: AzureClassifyService) {}

  @Post('predict')
  @UseInterceptors(FileInterceptor('image'))
  async classifyFood(@UploadedFile() file: Express.Multer.File) {
    return this.azureClassifyService.predictImage(file); // path 대신 파일 전체 전달
  }
}
