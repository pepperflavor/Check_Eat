import { PartialType } from '@nestjs/swagger';
import { CreateCommonAccountDto } from './create-common-account.dto';

export class UpdateCommonAccountDto extends PartialType(CreateCommonAccountDto) {}
