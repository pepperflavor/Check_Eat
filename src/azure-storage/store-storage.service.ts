import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseStorageService } from './azure-base-storage.service';

@Injectable()
export class StoreStorageService extends BaseStorageService {
  private readonly containerName = 'stores';

  constructor(config: ConfigService) {
    const conn = config.get<string>('AZURE_STORAGE_STRING_STORE');
    if (!conn) {
      throw new Error(
        '[StoreStorageService] AZURE_STORAGE_STRING_STORE 환경변수가 누락되었습니다.',
      );
    }
    super(conn);
  }

  async uploadStoreImage(file: Express.Multer.File) {
    return this.uploadFile(file, this.containerName);
  }

  async uploadMultiple(files: Express.Multer.File[]) {
    return this.uploadFiles(files, this.containerName);
  }

  async deleteStoreImage(url: string) {
    return this.deleteFile(url, this.containerName);
  }

  async listStoreImages() {
    return this.listBlobs(this.containerName);
  }

  async generateSignedUrl(blobName: string, minutes = 15) {
    return this.generateSasUrl(this.containerName, blobName, minutes);
  }
}