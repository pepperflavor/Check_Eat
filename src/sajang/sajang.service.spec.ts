import { Test, TestingModule } from '@nestjs/testing';
import { SajangService } from './sajang.service';

describe('SajangService', () => {
  let service: SajangService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SajangService],
    }).compile();

    service = module.get<SajangService>(SajangService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
