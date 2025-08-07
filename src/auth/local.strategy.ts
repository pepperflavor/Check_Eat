import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'ld_log_id', passwordField: 'ld_pwd' });
  }

  async validate(username: string, password: string): Promise<any> {
    console.log('로컬 스트레지 안 : ');
    console.log('✅ 받은 username:', username);
    console.log('✅ 받은 password:', password);
    const user = await this.authService.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('ID or Password is incorrect');
    }
    return user;
  }
}
