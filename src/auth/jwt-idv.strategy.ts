// jwt-idv.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtIdvStrategy extends PassportStrategy(Strategy, 'jwt-idv') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_IDV_SECRET!,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { idvId: string; jti: string }) {
    // (선택) jti 소진 여부 체크
    // const rec = await prisma.idvJti.findUnique({ where: { jti: payload.jti } });
    // if (!rec || rec.used) throw new UnauthorizedException();

    return { idvId: payload.idvId, jti: payload.jti };
  }
}
