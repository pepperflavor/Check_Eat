import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation, ApiProperty } from '@nestjs/swagger';
import { UserLocationDto } from './user_dto/user-location.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 유저 마이페이지

  // 닉네임 변경
  @Post('nick-change')
  async changeNickName() {}

  // 유저 메인 화면 처음 접속했을 때
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
    const result = await this.userService.mainPageStoresData(
      body.user_la,
      body.user_long,
      radius,
    );
    return result;
  }

  @ApiOperation({ summary: '가게 이름으로 검색하기', description : '가게이름 입력하면 관련 정보 찾아줌' })
  @Post('search-store-nm')
  async searchStore(@Body() body) {
    const result = await this.userService.getStoreByName(body.store_name);
    return result;
  }
}
