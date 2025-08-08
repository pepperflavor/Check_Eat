import { Test, TestingModule } from '@nestjs/testing';
import { AzureFoodClassifierService } from './azure-food-classifier.service';

describe('AzureFoodClassifierService', () => {
  let service: AzureFoodClassifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AzureFoodClassifierService],
    }).compile();

    service = module.get<AzureFoodClassifierService>(AzureFoodClassifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
