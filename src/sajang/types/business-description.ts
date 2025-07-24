interface ValidationApiRequest {
  businesses: BusinessDescription[];
}
interface BusinessDescription {
  b_no: string; // 사업자등록번호 (필수)
  start_dt: string; // 개업일자 (YYYYMMDD) (필수)
  p_nm: string; // 대표자 성명 (필수)
  p_nm2?: string; // 외국인일 경우 한글명
  b_nm?: string; // 상호
  corp_no?: string; // 법인등록번호
  b_sector?: string; // 업태명
  b_type?: string; // 종목명
  b_adr?: string; // 사업장주소
}
