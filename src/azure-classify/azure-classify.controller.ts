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

  @Post('food-name')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './uploads',
    }),
  )
  async classifyFood(@UploadedFile() file: Express.Multer.File) {
    const foodName = await this.azureClassifyService.classifyImageFromBuffer(
      file.buffer,
    );
    return { foodName };
  }
}
