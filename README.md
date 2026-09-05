# 🍽️ Check EAT
**비건, 알러지, 할랄 식단 정보를 반영한 음식점 리뷰·추천 및 데이터 분석 플랫폼**

> NestJS 기반 백엔드에서 PostgreSQL·PostGIS 위치 검색, OCR·AI 기반 음식 데이터 처리, Redis·Bull Queue 비동기 작업을 구현했습니다.

---

## 📖 프로젝트 소개
<img src="assets/간판이미지1.jpeg" alt="간판사진" width="600"> <img src="assets/간판이미지2.jpeg" alt="간판사진2" width="600">

Check EAT은 **일반 사용자용 서비스와 사업주용 서비스를 지원하는 NestJS 기반 백엔드**입니다.  
사용자의 비건 단계, 알러지, 할랄 조건을 음식점·메뉴 데이터와 조합해 맞춤 검색을 제공하고, OCR과 Azure AI를 활용해 리뷰 검증과 음식 데이터 등록 과정을 지원합니다.

### 일반 사용자
- 사용자 좌표를 기준으로 PostGIS 반경 검색을 수행하고 주변 음식점을 조회합니다.
- 비건 단계, 알러지, 할랄 조건을 반영해 음식점과 메뉴를 필터링합니다.
- 영수증 이미지를 분석해 가게명과 메뉴 정보를 추출하고 리뷰 작성에 활용합니다.
- 리뷰, 즐겨찾기, 식단·알러지 정보와 다국어 데이터를 관리합니다.

### 사업주
- 사업자등록증 이미지에서 인증에 필요한 정보를 추출하고 국세청 API로 진위 여부를 확인합니다.
- 음식 이미지를 분석해 음식명을 추론하고, LLM을 이용해 음식명·재료 정보를 보완합니다.
- 입력된 재료를 정규화하고 내부 규칙과 LLM 결과를 조합해 비건 단계를 판정합니다.
- 가게·메뉴 정보와 이미지를 등록하고 수정합니다.

---

## 🔍 백엔드 핵심 구현

### PostGIS 기반 위치 검색

PostgreSQL의 PostGIS 확장과 Prisma의 Raw Query를 사용해 사용자 좌표를 기준으로 반경 내 음식점을 조회합니다.

- `ST_DWithin`으로 지정 반경 내 음식점을 검색합니다.
- `ST_Distance`로 사용자 위치와 음식점 사이의 거리를 계산합니다.
- 비건 단계, 알러지, 할랄 조건과 음식점·메뉴 데이터를 조합해 사용자 조건에 맞는 음식점을 조회합니다.

```text
사용자 좌표 + 검색 반경
        ↓
PostGIS 반경 검색
        ↓
음식점 / 메뉴 조건 조회
        ↓
비건 · 알러지 · 할랄 조건 반영
        ↓
맞춤 음식점 결과 반환
```

### Redis + Bull Queue 비동기 처리

Redis와 Bull Queue를 사용해 외부 API 또는 AI 모델 호출처럼 실패하거나 처리 시간이 길어질 수 있는 작업의 재시도를 관리합니다.

#### 사업자등록증 인증 재시도
- 국세청 API의 서버 오류, 네트워크 오류, 타임아웃 등 재시도 가능한 오류를 구분합니다.
- 재시도 대상은 Bull Queue에 등록하며 최대 5회까지 처리합니다.
- 각 재시도는 10초 지연 및 고정 간격 backoff를 사용합니다.
- 최종 실패 시 사업자 인증 상태를 실패 상태로 갱신합니다.

#### 음식 데이터 처리 재시도
- 음식 처리 파이프라인과 비건 단계 판정 작업을 Bull Queue에 등록합니다.
- 음식 처리 작업은 최대 5회, 비건 단계 판정은 최대 3회 재시도합니다.
- 해당 작업에는 exponential backoff를 적용합니다.

### 사업자등록증 인증 파이프라인

사업자등록증 인증은 OCR과 국세청 API를 연결해 처리합니다.

```text
사업자등록증 이미지
        ↓
OCR
        ↓
인증에 필요한 필드 추출
        ↓
국세청 API 진위 여부 검증
        ↓
인증 상태 갱신
```

Azure Document Intelligence를 통해 이미지에서 필요한 데이터를 추출하고, 추출된 사업자 정보를 국세청 API 검증에 사용합니다. 외부 API 오류 중 재시도 가능한 경우에는 Bull Queue로 재등록합니다.

### AI 음식 데이터 처리 파이프라인

음식 등록 과정에서는 이미지 분류 모델과 Azure OpenAI를 단계적으로 사용합니다.

```text
음식 이미지
    ↓
음식 이미지 분류
    ↓
1차 음식명 추론
    ↓
Azure OpenAI 기반 음식명 / 재료 추론
    ↓
재료 정규화
    ↓
내부 규칙 + LLM 기반 비건 단계 판정
    ↓
음식 데이터 저장
```

- **Azure Machine Learning / Custom Vision 계열 분류 모델**: 음식 이미지 분류와 1차 음식명 추론
- **Azure OpenAI**: 음식명 보완, 재료 리스트 추론, 비건 단계 판정
- **내부 규칙**: 정규화된 재료를 기준으로 비건 단계를 판정하고 LLM 결과와 조합
- **Azure Blob Storage**: 리뷰·음식점·음식 이미지 저장
- **다국어 처리**: 음식 재료와 리뷰 등 서비스 데이터의 번역 처리

---

## 🚀 핵심 기능

## 👤 일반 사용자 기능
<br>
<br>

<img src="assets/체크잇 로그인유저 화면.jpeg" alt="로그인유저" width="200" heigth="200"><img src="assets/체크잇 비로그인 유저메인화면.jpeg" alt="비로그인유저메인" width="200" heigth="150">

### 계정 및 검색
- 회원가입 / 로그인 (JWT 인증)
- 사용자의 비건 단계, 알러지, 식단 정보 관리
- PostGIS 기반 위치 반경 음식점 검색
- 비건·알러지·할랄 조건 기반 필터링 검색
- 다국어 지원 (영어 / 아랍어 번역 데이터 반환)

### 리뷰
- 리뷰 등록 및 이미지 업로드 (Azure Blob Storage 연동)
- 영수증 이미지 분석을 통한 가게명·메뉴 정보 추출
- 자동 번역 지원
- "나중에 쓰기" 기능 제공

### 마이페이지
- 닉네임, 알러지, 식단 정보 수정
- 즐겨찾기 가게 목록 확인 및 수정
- 내가 작성한 리뷰 확인
- "나중에 쓰기" 리뷰 작성

<br>
<br>

## 🏪 사업주 기능
<br>
<br>

<img src="assets/메뉴등록화면.jpeg" alt="메뉴등록화면" width="200" heigth="200"><img src="assets/사업자등록증 스캔화면.jpeg" alt="사업자등록증" width="200" heigth="200">

### 사업자 인증
- OCR을 통한 사업자등록증 정보 추출
- 국세청 API를 통한 사업자등록증 진위 여부 검증
- 인증 상태 확인 및 재시도 처리

### 가게 관리
- 사업주 홈 화면에서 가게 정보 확인
- 가게 정보 및 메인 이미지 수정
- 메뉴 등록 및 수정

### 음식 데이터 등록
- 음식 이미지 기반 음식명 추론
- Azure OpenAI 기반 음식명 및 재료 정보 추론
- 재료 정규화 및 비건 단계 판정
- 음식 이미지 저장 및 메뉴 데이터 관리

---

## 🛠 기술 스택

- **Backend**: [NestJS](https://nestjs.com/), TypeScript
- **Database**: [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/), PostGIS
- **Async Processing**: Redis, Bull Queue
- **Cloud & AI**: Azure Blob Storage, Azure Document Intelligence, Azure OpenAI, Azure Machine Learning
- **Infra**: Docker

---

## 📂 프로젝트 구조

```bash
src/
 ├── auth/                    # JWT 인증 및 인증 전략
 ├── azure-document-ocr/      # Azure Document Intelligence OCR
 ├── azure-food-classifier/   # 음식 이미지 분류 및 1차 음식명 추론
 ├── azure-food-recognizer/   # Azure OpenAI 기반 음식명·재료·비건 단계 추론
 ├── azure-storage/           # Azure Blob Storage 업로드 / 다운로드
 ├── translate/               # 다국어 번역 처리
 ├── cache/                   # Redis 캐시
 ├── common/                  # 공통 예외 처리 및 유틸리티
 ├── common-account/          # 일반 사용자·사업주 공통 로그인
 ├── email/                   # SendGrid 이메일 발송
 ├── review/                  # 리뷰 기능
 ├── user/                    # 일반 사용자 기능
 ├── sajang/                  # 사업주 기능 및 사업자 인증 Queue
 └── main.ts                  # 애플리케이션 엔트리포인트
```

---

## ⚙️ 환경 변수 설정

프로젝트 실행 전 repository의 `.env.example`을 참고해 `.env` 파일을 구성합니다.

주요 설정 항목은 다음과 같습니다.

- PostgreSQL / Prisma 연결 정보
- Redis / Bull Queue 연결 정보
- Azure Blob Storage
- Azure Document Intelligence
- Azure OpenAI 및 음식 분류 모델
- 번역 API
- 국세청 API

실제 credential이나 secret은 repository에 포함하지 않습니다.

---

## ▶️ 실행 방법

```bash
npm install
npm run start:dev
```
