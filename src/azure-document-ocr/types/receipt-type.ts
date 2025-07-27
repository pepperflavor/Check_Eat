import { ApiOperation, ApiOkResponse } from '@nestjs/swagger';

export class MenuItemDto {
  name: string;
  price?: number;
  quantity?: number;
}

export class AnalyzeReceiptResponseDto {
  store: string;
  menus: MenuItemDto[];
}
