import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';
import { RegistFoodDto } from './dto/regist-food.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // 유저 리뷰 등록
  async userRegistReview(userId: number, reviData: RegistFoodDto) {
    // 메뉴 이름들, 추천 여부, 사진, 텍스트
  }
}
