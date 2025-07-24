import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseStorageService } from './azure-base-storage.service';

@Injectable()
export class OcrStorageService extends BaseStorageService {
  private readonly containerName: string;

  constructor(config: ConfigService) {
    const conn = config.get<string>('AZURE_STORAGE_STRING_OCR');
    if (!conn) {
      throw new Error(
        '[OCRstorageService] AZURE_STORAGE_STRING_OCR 환경변수가 누락되었습니다.',
      );
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
