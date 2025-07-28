import { Test, TestingModule } from '@nestjs/testing';
import { AzureClassifyController } from './azure-classify.controller';
import { AzureClassifyService } from './azure-classify.service';

describe('AzureClassifyController', () => {
  let controller: AzureClassifyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AzureClassifyController],
      providers: [AzureClassifyService],
    }).compile();

    controller = module.get<AzureClassifyController>(AzureClassifyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
