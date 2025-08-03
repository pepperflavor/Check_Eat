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
import { GetReviewOneMenuDto } from './dto/get-reviews-one-menu.dto';
import { RegistLaterReviewDto } from './dto/regist-later-review.dto';
import { WriteLaterReviewDto } from './dto/write-later-review.dto';

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

  // 나중에 쓰기로 등록
  @Post('regist-later')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '리뷰 나중에 쓰기 등록',
    description: '다음에 등록 버튼 눌렀을 때, 나중에 쓸 리뷰로 저장',
  })
  async registLaterList(@Req() req, @Body() body: RegistLaterReviewDto) {
    const ld_log_Id = req.user.sub;
    return await this.reviewService.userRegistWriteLater(
      ld_log_Id,
      body.sto_id,
    );
  }

  // 나중에 쓰기 등록해둔 리뷰 작성하기
  @Post('write-later-review')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 4))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '리뷰 나중에 쓰기한 리뷰 작성',
    description: '나중에 쓸 리뷰, 작성하기',
  })
  async writeLaterReview(
    @Req() req,
    @Body() body: WriteLaterReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const ld_log_Id = req.user.sub;
    const lang = req.user.lang;

    return await this.reviewService.writeLaterReview(
      ld_log_Id,
      lang,
      body,
      files,
    );
  }

  // 리뷰 작성페이지 진입
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
  @ApiOperation({
    summary: '가게 상세에서 한메뉴에 대한 리뷰들',
    description: '한 메뉴에 대한 리뷰들 데이터, 유저 언어값 보내주세요',
  })
  async getReviewBySotre(@Body() body: GetReviewOneMenuDto) {
    const { sto_id, foo_id, lang, page = 1, limit = 10 } = body;
    return await this.reviewService.oneMenuReviews(
      sto_id,
      foo_id,
      lang,
      page,
      limit,
    );
  }

  // 유저 마이페이지에서 자기가쓴 쓴 리뷰들 조회
  @Post('one-user-write-list')
  @UseGuards(JwtAuthGuard)
  async getReviewsByUserID(@Req() req, @Body() body) {
    const log_id = req.user.sub;
    const lang = req.user.lang;
    return await this.reviewService.oneUserReview(log_id, lang)
  }


  // 나중에 쓰기로 등록한 리뷰들 리스트 조회
  @Post('one-user-later-list')
  @UseGuards(JwtAuthGuard)
  async getLaterReviewsByUserID(@Req() req, @Body() body) {
    const log_id = req.user.sub;
    const lang = req.user.lang;
    return await this.reviewService.oneUserLaterReview(log_id);
  }

}
