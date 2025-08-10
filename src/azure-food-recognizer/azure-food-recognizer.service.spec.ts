import { Test, TestingModule } from '@nestjs/testing';
import { AzureFoodRecognizerService } from './azure-food-recognizer.service';

describe('AzureFoodRecognizerService', () => {
  let service: AzureFoodRecognizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AzureFoodRecognizerService],
    }).compile();

    service = module.get<AzureFoodRecognizerService>(AzureFoodRecognizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
