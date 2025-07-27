import { Module } from '@nestjs/common';
import { FoodSeedService } from './food-seed.service';
import { FoodSeedController } from './food-seed.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [FoodSeedController],
  providers: [FoodSeedService, PrismaService],
  exports: [FoodSeedService],
})
export class FoodSeedModule {}
