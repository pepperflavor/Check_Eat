import { Test, TestingModule } from '@nestjs/testing';
import { FoodSeedService } from './food-seed.service';

describe('FoodSeedService', () => {
  let service: FoodSeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodSeedService],
    }).compile();

    service = module.get<FoodSeedService>(FoodSeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
