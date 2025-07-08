import { Test, TestingModule } from '@nestjs/testing';
import { SajangController } from './sajang.controller';
import { SajangService } from './sajang.service';

describe('SajangController', () => {
  let controller: SajangController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SajangController],
      providers: [SajangService],
    }).compile();

    controller = module.get<SajangController>(SajangController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
