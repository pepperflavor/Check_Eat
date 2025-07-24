import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RegistFoodDto } from './dto/regist-food.dto';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // 유저가 리뷰 등록
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '유저 리뷰등록', description: '리뷰등록 하기' })
  async registReview(@Req() req, @Body() body: RegistFoodDto) {
    const userID = Number(req.user.sub);
    const result = await this.reviewService.userRegistReview(userID, body);
  }

  // 한 메뉴에 대한 리뷰 조회
  @Post('one-menu')
  @ApiOperation({ summary: '', description: '한 메뉴에 대한 리뷰들 데이터' })
  async getReviewBySotre() {}

  // 유저 마이페이지에서 자기가쓴 쓴 리뷰들 조회
  @Post('one-user')
  async getReviewsByUserID() {}
}
