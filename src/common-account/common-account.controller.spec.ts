import { Test, TestingModule } from '@nestjs/testing';
import { CommonAccountController } from './common-account.controller';
import { CommonAccountService } from './common-account.service';

describe('CommonAccountController', () => {
  let controller: CommonAccountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommonAccountController],
      providers: [CommonAccountService],
    }).compile();

    controller = module.get<CommonAccountController>(CommonAccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
