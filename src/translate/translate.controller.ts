import { Controller, Get, Query } from '@nestjs/common';
import { TranslateService } from './translate.service';

@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Get('test')
  async testTranslate(
    @Query('text') text: string,
    @Query('to') to: string,
    @Query('from') from: string,
  ) {
    const translate = await this.translateService.translateOneWord(text, to, from);
    return {
      translate,
    };
  }

  async translateManyWords(){

  }
}
