import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

interface BlobInfo {
  originalFileName: string;
  url: string;
  blobName: string;
}

@Injectable()
export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;

  constructor(private readonly configService: ConfigService) {
    const connectionString_Food = this.configService.get<string>(
      'AZURE_STORAGE_STRING_FOOD',
    );
    if (!connectionString_Food) {
      throw new Error('Azure storage connection string is not defined');
    }
    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString_Food);
  }

  // 컨테이너 이름받으면 그때 클라이언트 생성
  private getContainerClient(containerName: string): ContainerClient {
    return this.blobServiceClient.getContainerClient(containerName);
  }

  // UUID 형식의 파일명에서 원본 파일명 추출
  private extractOriginalFileName(blobName: string): string {
    const parts = blobName.split('-');
    if (parts.length > 1) {
      // UUID 부분을 제외한 나머지를 원본 파일명으로 간주
      return parts.slice(1).join('-');
    }
    return blobName;
  }

  // 컨테이너의 모든 Blob 목록 조회
  async listBlobs(containerName: string): Promise<BlobInfo[]> {
    const containerClient = this.getContainerClient(containerName);
    const blobs: BlobInfo[] = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      const blobClient = containerClient.getBlobClient(blob.name);
      blobs.push({
        originalFileName: this.extractOriginalFileName(blob.name),
        url: blobClient.url,
        blobName: blob.name,
      });
    }

    return blobs;
  }

  async uploadFile(
    file: Express.Multer.File,
    containerName: string,
  ): Promise<{ url: string; fileName: string }> {
    const containerClient = this.getContainerClient(containerName);
    const blobName = `${uuidv4()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    return {
      url: blockBlobClient.url,
      fileName: file.originalname,
    };
  }

  async uploadFiles(
    files: Express.Multer.File[],
    containerName: string,
  ): Promise<{ url: string; fileName: string }[]> {
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        return this.uploadFile(file, containerName);
      }),
    );
    return uploadedFiles;
  }

  async deleteFile(blobUrl: string, containerName: string): Promise<void> {
    const containerClient = this.getContainerClient(containerName);
    const blobName = new URL(blobUrl).pathname.split('/').pop();
    if (!blobName) {
      throw new Error('Invalid blob URL');
    }
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.delete();
  }
}
