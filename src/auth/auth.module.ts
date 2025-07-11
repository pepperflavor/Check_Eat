import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/user/user.module';
import { CacheConfigModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';
import { CommonAccountModule } from 'src/common-account/common-account.module';
import { SajangModule } from 'src/sajang/sajang.module';

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
    UserModule,
    CacheConfigModule,
    EmailModule,
    CommonAccountModule,
    SajangModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthModule],
})
export class AuthModule {}
