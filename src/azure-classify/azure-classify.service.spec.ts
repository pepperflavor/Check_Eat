import { Test, TestingModule } from '@nestjs/testing';
import { AzureClassifyService } from './azure-classify.service';

describe('AzureClassifyService', () => {
  let service: AzureClassifyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AzureClassifyService],
    }).compile();

    service = module.get<AzureClassifyService>(AzureClassifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
