// jwt-idv.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtIdvStrategy extends PassportStrategy(Strategy, 'jwt-idv') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_IDV_SECRET') || 'GET_EAT_APLLE',
      ignoreExpiration: false,
    });
  }

  async validate(payload: { idvId: string; jti: string }) {
    return { idvId: payload.idvId, jti: payload.jti };
  }
}
