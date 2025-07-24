import { Body, Controller, Post } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // 유저가 리뷰 등록
  @Post('register')
  @ApiOperation({ summary: '유저 리뷰등록', description: '리뷰등록 하기'})
  async registReview(@Body () body) {
    const result = await this.reviewService.userRegistReview()
  }

  // 한 메뉴에 대한 리뷰
  @Post('one-menu')
  async getReviewBySotre() {}

  // 유저 마이페이지에서 자기가쓴 쓴 리뷰들 조회
  @Post('one-user')
  async getReviewsByUserID() {}
}
