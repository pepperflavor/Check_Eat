import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseStorageService } from './azure-base-storage.service';

@Injectable()
export class ReviewStorageService extends BaseStorageService {
  private readonly containerName = 'reviews';

  constructor(config: ConfigService) {
    const conn = config.get<string>('REVIEW_CONNECT_STRING');
    if (!conn) {
      throw new Error(
        '[ReviewStorageService] REVIEW_CONNECT_STRING 환경변수가 누락되었습니다.',
      );
    }
    super(conn);
  }

  // 이미지 하나
  async uploadReviewImage(file: Express.Multer.File) {
    return this.uploadFile(file, this.containerName);
  }

  // async uploadMultiple(files: Express.Multer.File[]) {
  //   if (files.length > 4) {
  //     throw new Error('리뷰 이미지는 최대 4개까지만 업로드 가능합니다.');
  //   }
  //   return this.uploadFiles(files, this.containerName);
  // }

  // 리뷰 ID와 index를 기반으로 파일명 지정 업로드
  async uploadReviewImageWithName(
    file: Express.Multer.File,
    reviewId: number,
    index: number,
  ) {
    const extension = file.originalname.split('.').pop();
    const customFileName = `review-${reviewId}-${index}.${extension}`;
    return this.uploadFile(file, this.containerName, customFileName);
  }

  async uploadReviewImagesWithNames(
    files: Express.Multer.File[],
    reviewId: number,
  ): Promise<string[]> {
    if (files.length > 4) {
      throw new Error('리뷰 이미지는 최대 4개까지만 업로드 가능합니다.');
    }

    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadReviewImageWithName(
        files[i],
        reviewId,
        i + 1,
      );
      urls.push(result.url);
    }

    return urls;
  }

  async uploadReviewImages(files: Express.Multer.File[]): Promise<string[]> {
    if (files.length > 4) {
      throw new Error('리뷰 이미지는 최대 4개까지만 업로드 가능합니다.');
    }

    const uploadResults = await this.uploadFiles(files, this.containerName);
    return uploadResults.map((result) => result.url);
  }

  async deleteReviewImage(url: string) {
    return this.deleteFile(url, this.containerName);
  }

  async listReviewImages() {
    return this.listBlobs(this.containerName);
  }

  // 15분동안 임시 접근가능한 url
  async generateSignedUrl(blobName: string, minutes = 15) {
    return this.generateSasUrl(this.containerName, blobName, minutes);
  }
}
