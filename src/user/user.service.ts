import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { SignInDTO } from './user_dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { CreateUserDTO } from './user_dto/create-user.dto';
import { ConfigService } from '@nestjs/config';
import { randomNickMaker } from './randomNick';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createUser(createDTO: CreateUserDTO) {
    const SALT = this.config.get('BCRYPT_SALT_ROUNDS');

    let {
      log_Id,
      log_pwd,
      email,
      nickname,
      allergy,
      commonAllergies = [],
      vegan = 0,
      isHalal = 0,
    } = createDTO;

    const hashedPWD = await bcrypt.hash(log_pwd, SALT);

    if (nickname == '' || nickname == undefined) {
      nickname = randomNickMaker(1, 'ko');
    }

    const user = await this.prisma.user.create({
      data: {
        user_nick: nickname,
        user_email: email,
        user_allergy: allergy,
        user_vegan: vegan,
        user_is_halal: isHalal,
        user_allergy_common: commonAllergies.length // commonAllergies 받는 값 다시 프론트랑 확인하기
          ? {
              connect: commonAllergies.map((coalID) => ({ coal_id: coalID })),
            }
          : undefined,
      },
    });

    await this.prisma.loginData.create({
      data: {
        ld_log_id: log_Id,
        ld_pwd: hashedPWD,
        ld_usergrade: 0,
        ld_user_id: user.user_id, // 유저 아이디 연결
      },
    });

    return {
      message: '개인 유저 회원가입 성공',
      userId: user.user_id,
      status: HttpStatus.CREATED,
    };
  }

  // 로그인/ 회원가입때 존재하는 아이디 인지 확인
  async findById(loginDataDto: SignInDTO) {
    // const plainPWD = loginDataDto.ld_pwd;

    const user = await this.prisma.loginData.findUnique({
      where: {
        ld_log_id: loginDataDto.log_id,
      },
    });

    if (!user) {
      throw new HttpException(
        '사용자 아이디가 존재하지 않습니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return user;
  }

  async comparePassword(plainPWD: string, hashedPWD: string): Promise<boolean> {
    return bcrypt.compare(plainPWD, hashedPWD);
  }

  // 닉네임 변경
}
