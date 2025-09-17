import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomException } from 'src/common/errors/custom.exception';
import { ErrorCode } from 'src/common/errors/error-codes';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private config: ConfigService) {
    const secret = config.get<string>('JWT_RFRESH_SECRET');

    if (!secret) {
      throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, '서버 오류: JWT_RFRESH_SECRET이 설정되지 않았습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
