// src/portone/portone.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import axios from 'axios';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PortoneService {
  private readonly base = 'https://api.portone.io';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async start(dto: {
    phoneNumber: string;
    operator?: string;
    method?: 'SMS' | 'APP';
  }) {
    const iv_id = `idv_${randomUUID()}`;

    await this.prisma.identityVerification.create({
      data: {
        iv_id,
        iv_status: 'READY',
        iv_method: dto.method ?? 'SMS',
        iv_operator: dto.operator ?? null,
        iv_phoneNumber: dto.phoneNumber,
      },
    });

    try {
      await axios.post(
        `${this.base}/identity-verifications/${encodeURIComponent(iv_id)}/send`,
        {
          storeId: this.config.get('PORTONE_STORE_ID'),
          channelKey: this.config.get('PORTONE_CHANNEL_KEY'),
          method: dto.method ?? 'SMS',
          operator: dto.operator,
          customer: { phoneNumber: dto.phoneNumber },
        },
        {
          headers: {
            Authorization: `PortOne ${this.config.get('PORTONE_V2_SECRET')}`,
            'Idempotency-Key': randomUUID(),
          },
          timeout: 60000,
        },
      );
    } catch (e) {
      await this.prisma.identityVerification.update({
        where: { iv_id },
        data: { iv_status: 'FAILED' },
      });
      throw e;
    }

    // ✅ 웹뷰용 URL도 반환
    const baseUrl = this.config.get<string>('PUBLIC_BASE_URL')!;
    const webUrl = `${baseUrl}/portone/idv.html?id=${encodeURIComponent(iv_id)}`;

    return { id: iv_id, webUrl };
  }

  async confirm(dto: { id: string; otp?: string }) {
    const res = await axios.post(
      `${this.base}/identity-verifications/${encodeURIComponent(dto.id)}/confirm`,
      { storeId: this.config.get('PORTONE_STORE_ID'), otp: dto.otp },
      {
        headers: {
          Authorization: `PortOne ${this.config.get('PORTONE_V2_SECRET')}`,
          'Idempotency-Key': randomUUID(),
        },
        timeout: 60000,
      },
    );

    const p = res.data?.identityVerification ?? res.data;
    const toUtcDate = (d?: string) =>
      d ? new Date(`${d}T00:00:00.000Z`) : null;

    await this.prisma.identityVerification.update({
      where: { iv_id: dto.id },
      data: {
        iv_status: 'VERIFIED',
        iv_verifiedAt: new Date(),
        iv_name: p?.name ?? null,
        iv_phoneNumber: p?.phoneNumber ?? null,
        iv_gender: p?.gender ?? null,
        iv_birthDate: toUtcDate(p?.birthDate),
        iv_ci: p?.ci ?? null,
        iv_di: p?.di ?? null,
        iv_payload: p ?? null,
      },
    });

    const jti = randomUUID();
    const jwtSecret = this.config.get<string>('JWT_IDV_SECRET') ?? '';
    const token = jwt.sign({ idvId: dto.id, jti }, jwtSecret, {
      expiresIn: '5m',
      issuer: 'your-app',
    });
    return { token };
  }

  // src/portone/portone.service.ts  (추가)
  // service
  async startSdk(dto: { method?: 'SMS' | 'APP' }) {
    const iv_id = `idv_${randomUUID()}`;
    await this.prisma.identityVerification.create({
      data: { iv_id, iv_status: 'READY', iv_method: dto.method ?? 'SMS' },
    });

    const baseUrl = this.config.get<string>('PUBLIC_BASE_URL')!;
    const webUrl = `${baseUrl}/portone/idv.html?id=${encodeURIComponent(iv_id)}`;
    return { id: iv_id, webUrl };
  }

  async findById(iv_id: string) {
    const iv = await this.prisma.identityVerification.findUnique({
      where: { iv_id },
    });
    if (!iv) return null;
    return {
      name: iv.iv_name ?? null,
      phoneNumber: iv.iv_phoneNumber ?? null,
      gender: iv.iv_gender ?? null,
      birthDate: iv.iv_birthDate ?? null,
    };
  }

  async complete(id: string) {
    // 1) 포트원 V2 단건 조회
    const res = await axios.get(
      `https://api.portone.io/identity-verifications/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `PortOne ${this.config.get('PORTONE_V2_SECRET')}`,
        },
        timeout: 60000,
      },
    );
    const v = res.data?.identityVerification ?? res.data; // 스키마에 맞춰 안전 파싱

    // 2) 상태/고객정보 반영
    await this.prisma.identityVerification.update({
      where: { iv_id: id },
      data: {
        iv_status: v.status, // VERIFIED | FAILED | ...
        iv_verifiedAt: v.verifiedAt ? new Date(v.verifiedAt) : null,
        iv_name: v.verifiedCustomer?.name ?? null,
        iv_phoneNumber: v.verifiedCustomer?.phoneNumber ?? null,
        iv_gender: v.verifiedCustomer?.gender ?? null,
        iv_birthDate: v.verifiedCustomer?.birthDate
          ? new Date(v.verifiedCustomer.birthDate + 'T00:00:00Z')
          : null,
        iv_ci: v.verifiedCustomer?.ci ?? null,
        iv_di: v.verifiedCustomer?.di ?? null,
        iv_payload: v ?? null,
      },
    });

    // 3) 회원가입 페이지 진입용 짧은 토큰 발급(동일)
    const jti = randomUUID();
    const jwtSecret = this.config.get<string>('JWT_IDV_SECRET') ?? '';
    const token = jwt.sign({ idvId: id, jti }, jwtSecret, {
      expiresIn: '5m',
      issuer: 'your-app',
    });

    return { token };
  }
}
