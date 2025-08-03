// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { BaseStorageService } from './azure-base-storage.service';

// @Injectable()
// export class UserStorageService extends BaseStorageService {
//   private readonly containerName = 'users';

//   constructor(config: ConfigService) {
//     const conn = config.get<string>('AZURE_STORAGE_STRING_USER');
//     if (!conn) {
//       throw new Error(
//         '[UserStorageService] AZURE_STORAGE_STRING_USER 환경변수가 누락되었습니다.',
//       );
//     }
//     super(conn);
//   }

//   async uploadProfileImage(file: Express.Multer.File) {
//     return this.uploadFile(file, this.containerName);
//   }

//   async uploadMultiple(files: Express.Multer.File[]) {
//     return this.uploadFiles(files, this.containerName);
//   }

//   async deleteProfileImage(url: string) {
//     return this.deleteFile(url, this.containerName);
//   }

//   async listProfileImages() {
//     return this.listBlobs(this.containerName);
//   }

//   async generateSignedUrl(blobName: string, minutes = 15) {
//     return this.generateSasUrl(this.containerName, blobName, minutes);
//   }
// }