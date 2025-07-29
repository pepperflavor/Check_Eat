// check-business.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SajangService } from '../sajang.service';
import { BusinessRegistrationDTO } from '../sajang_dto/business_registration.dto';
import { PrismaService } from 'src/prisma.service';

@Processor('check-business')
export class CheckBusinessProcessor {
  constructor(
    private readonly sajangService: SajangService,
    private readonly prisma: PrismaService,
  ) {}

  @Process('retry-check')
  async retryCheck(job: Job<{ data: BusinessRegistrationDTO }>) {
    const { data } = job.data;
    try {
      console.log('사업자 등록 진위여부 재시도 중...');
      await this.sajangService.checkBusinessRegistration(data);
      // TODO: 성공 시 DB 업데이트
    } catch (err) {
      console.error('⛔ 재시도 실패:', err.message);

      if (job.attemptsMade >= (job.opts.attempts ?? 5)) {
        // 재시도 횟수
        await this.sajangService.finalFalure(data.sa_id); // 최종실패시 상태 변경
      }
    }
  }
}
