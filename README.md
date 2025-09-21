# 🍽️ Check EAT  
**비건, 알러지, 할랄 음식점 리뷰·추천 및 데이터 분석 플랫폼**  
> NestJS · PostgreSQL · Prisma · Azure AI 기반 음식 데이터 서비스  

---

## 📖 프로젝트 소개
<img src="assets/간판이미지1.jpeg" alt="간판사진" width="600"> <img src="assets/간판이미지2.jpeg" alt="간판사진2" width="600">



Check EAT은 일반유저와 사업주 두 개의 앱으로 이루어진 서비스입니다.

*일반유저는 자신의 비건단계와 알러지 정보가 반영된 음식점을 쉽게 검색할 수 있고, 리뷰를 남길 수 있는 **플랫폼**입니다.  
- 리뷰 작성시 : Azure AI를 활용하여 **영수증 이미지에서 자동으로 가게와 메뉴를 추출**하여 실제 방문 여부를 확인합니다.
- 다국어 지원 : **다국어 번역 기능**을 통해 다양한 언어권 사용자들이 접근할 수 있도록 설계했습니다.  
- 음식점 검색 : PostGIS 기반 반경 검색으로 **사용자의 위치 기반 음식점 추천 서비스**를 기본적으로 제공합니다.
- 필터링 검색 : 유저의 선호 식단과 할랄 식단 및 보유 알러지에 따라 맞춤 검색 기능을 제공합니다. 

*사업주는 자신의 사업자 등록증을 해당 플랫폼에서 검증 받은 후, 메뉴등록을 통해 유저에게 제공할 데이터를 등록할 수 있습니다.
- 사업자 등록증 인증 : OCR을 통해 사업자 등록증의 사진을 업로드 하면, 검증에 필요한 필드를 추출합니다.
- 메뉴등록 : 메뉴 등록시, Azure AI의 custom 모델과 LLM, classify 모델을 사용한 추론을 통해 손쉽게 등록할 수 있습니다. 특히 한식에 대해 미리 학습했기 때문에 재료 추출에 효율적입니다.
- 재료 입력 : 재료에 대한 정보 입력시, 편의성 제공을 위해 LLM을 이용해 보편적인 재료 추론 서비스를 통해 쉽게 등록할 수 있습니다.

---

## 🚀 핵심 기능

 ## 👩‍🦲 일반 유저 기능
 <br>
 <br>
 
 <img src="assets/체크잇 로그인유저 화면.jpeg" alt="로그인유저" width="200" heigth="200"><img src="assets/체크잇 비로그인 유저메인화면.jpeg" alt="비로그인유저메인" width="200" heigth="150"> 

 
  - 회원가입 / 로그인 (JWT 인증)
  - 마이페이지에서 작성 리뷰 및 즐겨찾기 관리
  - 다국어 지원 (영어/아랍어 번역 데이터 반환)
    
    - **리뷰**
  - 리뷰 등록 및 이미지 업로드 (Azure Blob Storage 연동)
  - 자동 번역 지원 (Azure OpenAI - LLM)
  - "나중에 쓰기" 기능 제공
 
    - **마이페이지**
  - 닉네임 변경, 알러지, 식단 정보등 정보 수정
  - 즐겨찾기 가게 목록 확인 및 수정
  - 내가 작성한 리뷰 확인
  - "나중에 쓰기" 리뷰 작성 

<br>
<br>

  ## 🏪 사업주 기능
<br>
<br>

 <img src="assets/메뉴등록화면.jpeg" alt="메뉴등록화면" width="200" heigth="200"><img src="assets/사업자등록증 스캔화면.jpeg" alt="사업자등록증" width="200" heigth="200">

 
   - **가게 관리** 
  - 사업주의 홈 화면에서 전반적인 가게의 정보 확인가능
  - 메뉴 수정 및 가게의 메인 이미지 수정 가능
  - OCR과 국세청 api를 통한 사업자 등록증 인증 및 인증 상태 확인


- **자동화**
  ### 1) 큐 & 재시도 (Bull Queue)
  - **사업자 등록증 진위여부 재시도**
  - OCR 실패/국세청 API 지연 시 **지수 백오프(backoff)**로 재시도
  - 성공 시 상태 갱신, 최종 실패 시 알림 발송  
- **이미지 처리 파이프라인**
  - 업로드 → 썸네일 생성 → 메타데이터 저장을 비동기 처리
- **번역/분류 대량 작업**
  - 긴 텍스트/다건 메뉴는 큐에 적재해 워커가 병렬 처리
 
  - ### 2) 데이터 파이프라인
- **음식 사진 → 추론 → 정규화**
  1) Azure OpenAI(Classifier)로 1차 음식명 추론.
  2) Azure OpenAI(LLM/Classifier)로 2차 음식명 및 재료 리스트 추론 
  3) 음식 재료입력 후, LLM과 내부 정규 규칙으로 비건 단계 추론 
     


- **AI/ML**
  - Azure Document Intelligence: 영수증 이미지 분석 (가게명·메뉴 추출)
  - Azure OpenAI: 텍스트 후처리 및 번역, 음식명 2차 추론, 재료 리스트 추론.
  - Azure Machine Learning: 음식 이미지 분류 모델 학습, 음식명 1차 추론  

---

<br>

## 🛠 기술 스택

- **Backend**: [NestJS](https://nestjs.com/), TypeScript  
- **Database**: [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/), PostGIS  
- **Infra & DevOps**: Docker, Redis, Bull Queue  
- **Cloud & AI**: Azure Blob Storage, Azure Document Intelligence, Azure OpenAI, Azure Machine Learning  

---

<br>
## 📂 프로젝트 구조

```bash
src/
 ├── auth/   # 인증 관련, jwt 토큰 전략
 ├── azure-document-ocr/   # Azure Document Intelligence 모듈, ocr 관련
 ├── azure-food-classifier/ # Azure Classify 모델, 1차 음식명 추론 관련 , 재료 추론 관련
 ├── azure-food-recognizer/ # Azure LLM, 2차 음식명 추론 및 재료 추론 관련
 ├── azure-storage/        # Azure Storage 업로드/다운로드 기능
 ├── translate/ # Azure translate 번역 관련.
 ├── cache/ # Redis 캐시 관련
 ├── common/ # 예외처리, 유틸 함수
 ├── common-account/ # 일반 유저, 업주 공통 로그인 관련
 ├── email/ # SendGrid 이메일 발송 관련
 ├── review/               # 리뷰 관련 서비스
 ├── user/                 # 유저 기능 관련
 ├── sajang/               # 업주 기능 관련
 └── main.ts               # 앱 엔트리포인트


## ⚙️ 환경 변수 설정

프로젝트 실행 전 `.env` 파일을 생성하고 아래 항목을 설정하세요:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/checkeat

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Azure Blob Storage
AZURE_STORAGE_STRING_FOOD=your_azure_blob_storage_connection
AZURE_STORAGE_STRING_OCR=your_azure_blob_storage_connection

# Azure Document Intelligence (영수증 OCR)
AZURE_OCR_KEY=your_azure_ocr_key

# Azure OCR
OCR_ENDPOINT=your_azure_OCR_endpoint 
OCR_KEY=your_azure_OCR_connection
CUSTOM_MODEL_ID=your_cutom_modle_ID

# Azure Translate (텍스트 처리 / 번역)
TRANSLATE_API_KEY=your_azure_openai_key
TRANSLATE_ENDPOINT="https://api.cognitive.microsofttranslator.com"
TRANSLATE_API_REGION=your_region

# 국세청 관련
IRS_URL=https://api.odcloud.kr/api/nts-businessman/v1/validate
IRS_SERVICE_KEY="your service key"
