import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiProperty } from '@nestjs/swagger';
import { UserLocationDto } from './user_dto/user-location.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 유저 마이페이지

  // 닉네임 변경
  @Post('nick')
  async changeNickName() {}

  // 유저 메인 화면 처음 접속했을 때
  // 본인 좌표 받고, 좌표 기준으로 반경 1km 내에 있는 음식점 좌표 리턴해줌
  @Post('user-main')
  // @UseGuards(JwtAuthGuard) // 일단 주석걸어둠
  @ApiProperty({})
  async userMain(@Body() body: UserLocationDto) {
    // 혹시 몰라서 반경은 변수로 두기
    const radius = 1000;
    const result = await this.userService.mainPageStoresData(
      body.user_la,
      body.user_long,
      radius,
    );

    return result;
  }
}
