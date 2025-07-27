import { Controller, Post } from '@nestjs/common';
import { FoodSeedService } from './food-seed.service';

@Controller('food-seed')
export class FoodSeedController {
  constructor(private readonly foodSeedService: FoodSeedService) {}

  @Post('test')
  async testFn() {
    return await this.foodSeedService.seedRecipes();
  }
}
