import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseStorageService } from './azure-base-storage.service';

@Injectable()
export class FoodStorageService extends BaseStorageService {
  constructor(config: ConfigService) {
    const conn = config.get<string>('AZURE_STORAGE_STRING_FOOD');
    if (!conn) {
      throw new Error(
        '[FoodStorageService] AZURE_STORAGE_STRING_FOOD 환경변수가 누락되었습니다.',
      );
    }
    super(conn);
  }

  async upload(file: Express.Multer.File, containerName: string) {
    return this.uploadFile(file, containerName);
  }

  async uploadMultiple(files: Express.Multer.File[], containerName: string) {
    return this.uploadFiles(files, containerName);
  }

  async delete(url: string, containerName: string) {
    return this.deleteFile(url, containerName);
  }

  async list(containerName: string) {
    return this.listBlobs(containerName);
  }

  async generateSignedUrl(
    containerName: string,
    blobName: string,
    minutes = 15,
  ) {
    return this.generateSasUrl(containerName, blobName, minutes);
  }
}
