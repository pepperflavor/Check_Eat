import { Test, TestingModule } from '@nestjs/testing';
import { AzureFoodClassifierController } from './azure-food-classifier.controller';
import { AzureFoodClassifierService } from './azure-food-classifier.service';

describe('AzureFoodClassifierController', () => {
  let controller: AzureFoodClassifierController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AzureFoodClassifierController],
      providers: [AzureFoodClassifierService],
    }).compile();

    controller = module.get<AzureFoodClassifierController>(AzureFoodClassifierController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
