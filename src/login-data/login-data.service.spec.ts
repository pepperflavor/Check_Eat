import { Test, TestingModule } from '@nestjs/testing';
import { LoginDataService } from './login-data.service';

describe('LoginDataService', () => {
  let service: LoginDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginDataService],
    }).compile();

    service = module.get<LoginDataService>(LoginDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
