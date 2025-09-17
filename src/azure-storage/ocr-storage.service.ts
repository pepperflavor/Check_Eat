import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseStorageService } from './azure-base-storage.service';
import { CustomException } from 'src/common/errors/custom.exception';
import { ErrorCode } from 'src/common/errors/error-codes';

@Injectable()
export class OcrStorageService extends BaseStorageService {
  private readonly containerName: string;

  constructor(config: ConfigService) {
    const conn = config.get<string>('AZURE_STORAGE_STRING_OCR');
    if (!conn) {
      throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, '[OcrStorageService] 환경변수가 누락되었습니다.');

    }
    super(conn);
    this.containerName =
      config.get<string>('OCR_CONTAINER_NAME') ?? 'certification-example';
  }

  async upload(file: Express.Multer.File) {
    return this.uploadFile(file, this.containerName);
  }

  async uploadMultiple(files: Express.Multer.File[]) {
    return this.uploadFiles(files, this.containerName);
  }

  async delete(url: string) {
    return this.deleteFile(url, this.containerName);
  }
}
