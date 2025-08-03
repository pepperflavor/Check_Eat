import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { UserLocationDto } from './user_dto/user-location.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { UpdateNickDto } from './user_dto/update-nick.dto';
import { SearchStoreByVeganDto } from './user_dto/search-store-by-vegan.dto';
import { DetailStoreDto } from './user_dto/detail-store.dto';
import { OptionalUser } from 'src/auth/decorator/user.decorator';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  //==== 유저 마이페이지

  // 닉네임 변경
  @Post('nick-change')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '닉네입 변경하기', description: '닉네임 변경하기' })
  async changeNickName(@Req() req, @Body() body: UpdateNickDto) {
    const log_id = req.user.sub
    console.log(log_id)
    return await this.userService.updateNick(log_id, body.nickname);
  }

  // 내가쓴 리뷰 리스트
  @Post('my-reviews')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(@Req() req) {
    const log_id = Number(req.user.sub);
    return await this.userService.myAllReviews(log_id);
  }

  //====== 유저 메인 화면관련
  // 처음 접속했을 때
  // 본인 좌표 받고, 좌표 기준으로 반경 1km 내에 있는 음식점 좌표 리턴해줌
  @Post('main')
  // @UseGuards(JwtAuthGuard) // 일단 주석걸어둠
  @ApiOperation({
    summary: '유저 지도 홈화면 주변 가게',
    description: '유저 현재 위치 위도, 경도 보내주면 됨',
  })
  async userMain(@Body() body: UserLocationDto) {
    // 혹시 몰라서 반경은 변수로 두기
    const radius = 2000;
    const lang = '';
    const result = await this.userService.mainPageStoresData(
      body.user_la,
      body.user_long,
      radius,
    );
    return result;
  }

  @ApiOperation({
    summary: '가게 이름으로 검색하기',
    description: '가게이름 입력하면 관련 정보 찾아줌',
  })
  @Post('search-store-nm')
  async searchStoreByName(@Req() req, @Body() body) {
    // 유저가 쓰는 언어 추출
    const lang = req.user.lang;
    // store 아이디랑 이름 같이 보내줘야할듯
    const result = await this.userService.getStoreByName(lang, body);
    return result;
  }

  // 비건 단계로 가게 찾기
  @ApiOperation({
    summary: '',
    description: '비건 단계로 가게 검색하기, 반경 2KM 이내',
  })
  // @UseGuards(JwtAuthGuard)
  @Post('search-store-vegan')
  async searchStoreByVegan(@Body() body: SearchStoreByVeganDto) {
    const result = await this.userService.getStoreByVegan(body);
  }

  // 가게 디테일 페이지
  // 로그인한 유저인지 아닌지에 따라서 언어 추출하는 곳 달라짐
  @Post('detail-store')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: '가게 디테일 페이지 데이터',
    description: '가게 하나 선택했을때 디테일 페이지 데이터 요청',
  })
  async getStoreDetail(
    @OptionalUser() user: any,
    @Body() body: DetailStoreDto,
  ) {
    const lang = user?.lang || body.user_lang || 'ko'; // 언어 전달안되면 ko로 함
    const result = await this.userService.detailStoreData(body.sto_id, lang, {
      user_allergy: user?.user_allergy,
      user_allergy_common: user?.user_allergy_common || [],
    });
    return result;
  }
}
