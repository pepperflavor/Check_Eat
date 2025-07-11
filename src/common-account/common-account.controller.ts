import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CommonAccountService } from './common-account.service';

@Controller('common-account')
export class CommonAccountController {
  constructor(private readonly commonAccountService: CommonAccountService) {}
}
