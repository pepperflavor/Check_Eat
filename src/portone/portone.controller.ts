import { Controller, Post } from '@nestjs/common';
import { PortoneService } from './portone.service';

@Controller('portone')
export class PortoneController {
  constructor(private readonly portoneService: PortoneService) {}

  @Post('start')
  async start(){}

  @Post('confirm')
  async confirm(){}

  // @Get()
}
