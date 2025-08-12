import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { CacheConfigModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';
import { CommonAccountModule } from 'src/common-account/common-account.module';
import { SajangModule } from 'src/sajang/sajang.module';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { JwtIdvStrategy } from './jwt-idv.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (ConfigService: ConfigService) => ({
        secret: ConfigService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: ConfigService.get<string>('JWT_EXPIRATION') || '1h',
        },
      }),
    }),
    forwardRef(() => UserModule),
    CacheConfigModule,
    EmailModule,
    CommonAccountModule,
    SajangModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, JwtIdvStrategy],
  exports: [AuthService],
})
export class AuthModule {}
