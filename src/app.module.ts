import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheConfigModule } from './cache/cache.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CrawlingModule } from './crawling/crawling.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { EmailModule } from './email/email.module';
import { AzureStorageModule } from './azure-storage/azure-storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    CrawlingModule,
    CacheConfigModule,
    EmailModule,
    AzureStorageModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
