import { Test, TestingModule } from '@nestjs/testing';
import { AzureDocumentOcrService } from './azure-document-ocr.service';

describe('AzureDocumentOcrService', () => {
  let service: AzureDocumentOcrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AzureDocumentOcrService],
    }).compile();

    service = module.get<AzureDocumentOcrService>(AzureDocumentOcrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
