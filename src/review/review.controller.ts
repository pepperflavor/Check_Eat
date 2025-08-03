import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReviewService } from './review.service';
import { ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { RegistFoodReviewDto } from './dto/regist-food-review.dto';
import { IsRegistStoreDto } from './dto/is-regist-store.dto';
import { GetReviewFoodsPageDto } from './dto/get-review-foods-list.dto';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // 우리 어플에 등록된 가게인지 확인하기
  // 가게명이 일치하는지 확인
  // 외국어 지원해야 함 ... 어케하누ㅜㅜㅜㅜ

  @Post('can-write')
  @ApiOperation({
    summary: '우리 어플에 등록된 가게인지 확인',
    description: '영수증에 있는 데이터 보내주세요',
  })
  @UseGuards(JwtAuthGuard)
  async checkregistStore(@Req() req, @Body() body: IsRegistStoreDto) {
    const lang = req.user.ld_lang;
    return await this.reviewService.checkRegistStore(
      body.sto_address,
      body.sto_name,
    );
  }

  @Post('regist-page')
  @ApiOperation({
    summary: '리뷰 작성페이지에 진입할때 필요한 음식 데이터',
    description: '리뷰 작성페이지에 진입할때 필요한 음식 데이터 리턴',
  })
  @UseGuards(JwtAuthGuard)
  async reviewWritePage(@Req() req, @Body() body: GetReviewFoodsPageDto) {
    const lang = req.user.ld_lang;
    return await this.reviewService.oneStoreFoodsList(body.sto_id, lang);
  }

  // 유저가 리뷰 등록
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 4)) // 최대 4개 파일
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '유저 리뷰등록',
    description: '리뷰등록 하기 (최대 4개 이미지 업로드 가능)',
  })
  async registReview(
    @Req() req: any,
    @Body() body: RegistFoodReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userID = req.user.sub;
    const lang = req.user.lang;
    const result = await this.reviewService.userRegistReview(
      userID, // ld_log_id 임
      body,
      files,
      lang,
    );
    return result;
  }

  // 한 메뉴에 대한 리뷰 조회
  @Post('one-menu')
  @ApiOperation({ summary: '', description: '한 메뉴에 대한 리뷰들 데이터' })
  async getReviewBySotre() {}

  // 유저 마이페이지에서 자기가쓴 쓴 리뷰들 조회
  @Post('one-user')
  async getReviewsByUserID() {}
}
