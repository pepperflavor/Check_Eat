import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from 'src/prisma.service';
import { CacheConfigModule } from 'src/cache/cache.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [CacheConfigModule, EmailModule],
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
