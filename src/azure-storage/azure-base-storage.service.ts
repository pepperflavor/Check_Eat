import {
  BlobServiceClient,
  ContainerClient,
  BlobDownloadResponseParsed,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';

export abstract class BaseStorageService {
  protected blobServiceClient: BlobServiceClient;

  constructor(protected readonly connectionString: string) {
    this.blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
  }

  protected getContainerClient(containerName: string): ContainerClient {
    return this.blobServiceClient.getContainerClient(containerName);
  }

  async uploadFile(
    file: Express.Multer.File,
    containerName: string,
  ): Promise<{ url: string; fileName: string }> {
    const blobName = `${Date.now()}-${file.originalname}`;
    const containerClient = this.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
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
    return Promise.all(
      files.map((file) => this.uploadFile(file, containerName)),
    );
  }

  async deleteFile(blobUrl: string, containerName: string): Promise<void> {
    const blobName = new URL(blobUrl).pathname.split('/').pop();
    if (!blobName) throw new Error('Invalid blob URL');

    const containerClient = this.getContainerClient(containerName);
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.deleteIfExists();
  }

  // ✅ 1. listBlobs
  async listBlobs(
    containerName: string,
  ): Promise<{ blobName: string; url: string }[]> {
    const containerClient = this.getContainerClient(containerName);
    const result: { blobName: string; url: string }[] = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      const blobClient = containerClient.getBlobClient(blob.name);
      result.push({ blobName: blob.name, url: blobClient.url });
    }

    return result;
  }

  // ✅ 2. getBlob (버퍼 형태로 읽기)
  async getBlob(containerName: string, blobName: string): Promise<Buffer> {
    const containerClient = this.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadResponse: BlobDownloadResponseParsed =
      await blobClient.download();

    const chunks: Uint8Array[] = [];
    const stream = downloadResponse.readableStreamBody;
    if (!stream)
      throw new Error('No readable stream in blob download response');
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  // ✅ 3. generateSasUrl (임시 공개 링크 생성)
  async generateSasUrl(
    containerName: string,
    blobName: string,
    expiresInMinutes = 15,
  ): Promise<string> {
    const accountName = this.extractAccountName();
    const accountKey = this.extractAccountKey();

    const sharedKeyCredential = new StorageSharedKeyCredential(
      accountName,
      accountKey,
    );
    const containerClient = this.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const expiresOn = new Date(
      new Date().valueOf() + expiresInMinutes * 60 * 1000,
    );
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'), // read-only
        expiresOn,
        protocol: SASProtocol.Https,
      },
      sharedKeyCredential,
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  }

  // 🔐 도우미: 계정 이름/키 추출
  private extractAccountName(): string {
    const match = this.connectionString.match(/AccountName=([^;]+);/);
    return match?.[1] ?? '';
  }

  private extractAccountKey(): string {
    const match = this.connectionString.match(/AccountKey=([^;]+);/);
    return match?.[1] ?? '';
  }
}
