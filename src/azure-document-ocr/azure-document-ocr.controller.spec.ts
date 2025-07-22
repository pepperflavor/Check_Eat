import { Test, TestingModule } from '@nestjs/testing';
import { AzureDocumentOcrController } from './azure-document-ocr.controller';
import { AzureDocumentOcrService } from './azure-document-ocr.service';

describe('AzureDocumentOcrController', () => {
  let controller: AzureDocumentOcrController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AzureDocumentOcrController],
      providers: [AzureDocumentOcrService],
    }).compile();

    controller = module.get<AzureDocumentOcrController>(AzureDocumentOcrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
