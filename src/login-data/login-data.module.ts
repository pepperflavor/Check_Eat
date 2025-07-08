import { Module } from '@nestjs/common';
import { LoginDataService } from './login-data.service';
import { LoginDataController } from './login-data.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [LoginDataController],
  providers: [LoginDataService, PrismaService],
  exports: [LoginDataService],
})
export class LoginDataModule {}
