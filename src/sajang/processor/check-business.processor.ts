// check-business.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SajangService } from '../sajang.service';
import { BusinessRegistrationDTO } from '../sajang_dto/business_registration.dto';

@Processor('check-business')
export class CheckBusinessProcessor {
  constructor(private readonly sajangService: SajangService) {}

  @Process('retry-check')
  async retryCheck(job: Job<{ sa_id: string; data: BusinessRegistrationDTO }>) {
    try {
      console.log('🔁 재시도 중...');
      await this.sajangService.checkBusinessRegistration(
        job.data.sa_id,
        job.data.data,
      );
      // TODO: 성공 시 DB 업데이트
    } catch (err) {
      console.error('⛔ 재시도 실패:', err.message);
    }
  }
}
