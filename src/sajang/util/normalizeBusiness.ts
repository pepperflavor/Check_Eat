import { BadRequestException } from '@nestjs/common';
import { BusinessRegistrationDTO } from '../sajang_dto/business_registration.dto';

// 입력 정규화
export function normalizeBusinessInput(data: BusinessRegistrationDTO) {
  const bsNo = data.b_no.replace(/-/g, '').trim();
  if (!/^\d{10}$/.test(bsNo)) {
    throw new BadRequestException('사업자등록번호는 숫자 10자리여야 합니다.');
  }

  // 좌표 파싱 (string → number)
  const lat = Number(String(data.sto_latitude).trim());
  const lon = Number(String(data.sto_longitude).trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new BadRequestException('위도/경도 값이 유효한 숫자가 아닙니다.');
  }

  // BusinessCerti 컬럼 매핑 (DTO가 없으면 빈 문자열로)
  const bs_name = (data.b_nm ?? data.sto_name ?? '').trim();
  const bs_type = (data.b_type ?? data.b_sector ?? '').trim();
  const bs_address = (data.b_adr ?? '').trim();

  return {
    bsNo,
    bs_name,
    bs_type,
    bs_address,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
  };
}
