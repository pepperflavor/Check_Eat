import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomException } from 'src/common/errors/custom.exception';
import { ErrorCode } from 'src/common/errors/error-codes';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'ld_log_id', passwordField: 'ld_pwd' });
  }

  async validate(username: string, password: string): Promise<any> {

    const user = await this.authService.validateUser(username, password);

    if (!user) {
      throw new CustomException(ErrorCode.UNAUTHORIZED, '아이디 또는 비밀번호가 일치하지 않습니다.')
  
    }
    return user;
  }
}
