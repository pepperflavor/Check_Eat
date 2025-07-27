import { Test, TestingModule } from '@nestjs/testing';
import { FoodSeedController } from './food-seed.controller';
import { FoodSeedService } from './food-seed.service';

describe('FoodSeedController', () => {
  let controller: FoodSeedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodSeedController],
      providers: [FoodSeedService],
    }).compile();

    controller = module.get<FoodSeedController>(FoodSeedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
