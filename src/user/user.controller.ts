import { Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // 유저 마이페이지

  // 닉네임 변경
  @Post('nick')
  async changeNickName() {}
}
