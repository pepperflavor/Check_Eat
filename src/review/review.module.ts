import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports:[],
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
  exports: [ReviewService]
})
export class ReviewModule {}
