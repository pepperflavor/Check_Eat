import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseStorageService } from './azure-base-storage.service';
import { CustomException } from 'src/common/errors/custom.exception';
import { ErrorCode } from 'src/common/errors/error-codes';

@Injectable()
export class StoreStorageService extends BaseStorageService {
  private readonly containerName = 'store-board';

  constructor(config: ConfigService) {
    const conn = config.get<string>('STORE_BOARD_CONNECT_STRING');
    if (!conn) {
      throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, '[StoreStorageService]  환경변수가 누락되었습니다.');

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