# 🍽️ Check EAT  
**비건, 알러지, 할랄 음식점 리뷰·추천 및 데이터 분석 플랫폼**  
> NestJS · PostgreSQL · Prisma · Azure AI 기반 음식 데이터 서비스  

---

## 📖 프로젝트 소개
Check EAT은 사용자가 음식점을 쉽게 찾고 리뷰를 남길 수 있는 **음식점 리뷰 플랫폼**입니다.  
Azure AI를 활용하여 **영수증 이미지에서 자동으로 가게와 메뉴를 추출**하고, **다국어 번역 기능**을 통해 다양한 언어권 사용자들이 접근할 수 있도록 설계했습니다.  

또한, PostGIS 기반 반경 검색으로 **위치 중심 음식점 추천 서비스**를 제공합니다.  

---

## 🚀 핵심 기능

- **회원 관리**
  - 회원가입 / 로그인 (JWT 인증)
  - 마이페이지에서 작성 리뷰 및 즐겨찾기 관리  

- **가게 관리**
  - 음식점 기본 정보 조회
  - 반경 기반 검색 (PostGIS 활용)
  - 다국어 지원 (영어/아랍어 번역 데이터 반환)

- **리뷰**
  - 리뷰 등록 및 이미지 업로드 (Azure Blob Storage 연동)
  - 자동 번역 지원 (Azure OpenAI)
  - "나중에 쓰기" 기능 제공

- **즐겨찾기**
  - 음식점 즐겨찾기 등록/삭제
  - 즐겨찾기 순서 유지 (`order_index`)

- **자동화**
  - 공공데이터 API 기반 음식 레시피 자동 수집 및 DB 시드 데이터 저장
  - KBO 경기 정보 크롤링 (선발투수, 경기 시간, 중계 이미지 등)

- **AI/ML**
  - Azure Document Intelligence: 영수증 이미지 분석 (가게명·메뉴 추출)
  - Azure OpenAI: 텍스트 후처리 및 번역
  - Azure Machine Learning: 음식 이미지 분류 모델 학습 및 배포  

---

## 🛠 기술 스택

- **Backend**: [NestJS](https://nestjs.com/), TypeScript  
- **Database**: [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/), PostGIS  
- **Infra & DevOps**: Docker, Redis, Bull Queue  
- **Cloud & AI**: Azure Blob Storage, Azure Document Intelligence, Azure OpenAI, Azure Machine Learning  

---

## 📂 프로젝트 구조

```bash
src/
 ├── azure-document-ocr/   # Azure Document Intelligence 모듈
 ├── azure-storage/        # Azure Storage 업로드/다운로드 기능
 ├── review/               # 리뷰 관련 서비스
 ├── store/                # 음식점 관련 서비스
 ├── user/                 # 유저 관리
 ├── common/               # 예외처리, 유틸 함수
 └── main.ts               # 앱 엔트리포인트
