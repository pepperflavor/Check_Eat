import { Test, TestingModule } from '@nestjs/testing';
import { AzureFoodRecognizerController } from './azure-food-recognizer.controller';
import { AzureFoodRecognizerService } from './azure-food-recognizer.service';

describe('AzureFoodRecognizerController', () => {
  let controller: AzureFoodRecognizerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AzureFoodRecognizerController],
      providers: [AzureFoodRecognizerService],
    }).compile();

    controller = module.get<AzureFoodRecognizerController>(AzureFoodRecognizerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
