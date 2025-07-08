import { Test, TestingModule } from '@nestjs/testing';
import { LoginDataController } from './login-data.controller';
import { LoginDataService } from './login-data.service';

describe('LoginDataController', () => {
  let controller: LoginDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoginDataController],
      providers: [LoginDataService],
    }).compile();

    controller = module.get<LoginDataController>(LoginDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
