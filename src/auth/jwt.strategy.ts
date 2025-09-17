import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CustomException } from 'src/common/errors/custom.exception';
import { ErrorCode } from 'src/common/errors/error-codes';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new CustomException(ErrorCode.INTERNAL_SERVER_ERROR, '서버 오류: JWT_ACCESS_SECRET이 설정되지 않았습니다.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    const baseUser = {
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
      lang: payload.lang,
    };

    if (payload.role === 0) {
      // 일반 사용자
      return {
        ...baseUser,
        user_vegan: payload.user_vegan,
        user_halal: payload.user_halal,
        user_allergy: payload.user_allergy,
        user_allergy_common: payload.user_allergy_common,
        user_nick: payload.user_nick,
      };
    }

    if (payload.role === 1) {
      // 사장님
      return {
        ...baseUser,
        sa_id: payload.sa_id,
        sto_id: payload.sto_id,
      };
    }

    // 잘못된 권한
    throw new CustomException(ErrorCode.UNAUTHORIZED, '잘못된 권한입니다.');

  }
}
