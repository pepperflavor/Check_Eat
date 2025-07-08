import { Controller } from '@nestjs/common';
import { LoginDataService } from './login-data.service';

@Controller('login-data')
export class LoginDataController {
  constructor(private readonly loginDataService: LoginDataService) {}
}
