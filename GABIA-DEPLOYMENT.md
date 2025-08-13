# 가비아 도메인 + Azure VM 배포 가이드

Check Eat Backend를 가비아에서 구매한 도메인과 Azure VM을 사용해 배포하는 완벽한 가이드입니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [가비아 DNS 설정](#가비아-dns-설정)
3. [Azure VM 준비](#azure-vm-준비)
4. [자동 배포 실행](#자동-배포-실행)
5. [SSL 인증서 설정](#ssl-인증서-설정)
6. [서비스 관리](#서비스-관리)
7. [문제 해결](#문제-해결)

## 🚀 사전 준비사항

### 필요한 것들
- ✅ 가비아에서 구매한 도메인
- ✅ Azure VM (Ubuntu 20.04 LTS 권장)
- ✅ VM에 대한 SSH 접근 권한
- ✅ 이메일 주소 (SSL 인증서용)

### 권장 VM 사양
- **최소**: 2 vCPU, 4GB RAM, 20GB SSD
- **권장**: 4 vCPU, 8GB RAM, 40GB SSD
- **고성능**: 8 vCPU, 16GB RAM, 80GB SSD

## 🌐 가비아 DNS 설정

### 1단계: My가비아 접속
1. [My가비아](https://my.gabia.com)에 로그인
2. **서비스 관리** → **DNS 관리** 클릭

### 2단계: DNS 설정
1. 구매한 도메인 선택
2. **DNS 설정** 버튼 클릭
3. **레코드 추가**를 통해 A 레코드 설정:

```
레코드 타입: A
호스트: @ (루트 도메인용) 또는 api (서브도메인용)
값: Azure VM의 공인 IP 주소
TTL: 3600 (기본값)
```

### 예시 설정
```
도메인: example.co.kr
서브도메인을 사용하는 경우:
- 호스트: api
- 결과 URL: api.example.co.kr

루트 도메인을 사용하는 경우:
- 호스트: @
- 결과 URL: example.co.kr
```

### 3단계: DNS 전파 확인
설정 후 DNS 전파를 기다려야 합니다 (최대 24시간).

```bash
# DNS 전파 확인 명령어
nslookup your-domain.co.kr
```

## ☁️ Azure VM 준비

### 1단계: VM 생성
1. Azure Portal에서 새 가상 머신 생성
2. **Ubuntu 20.04 LTS** 선택
3. **인바운드 포트 규칙**에서 HTTP(80), HTTPS(443), SSH(22) 열기

### 2단계: 네트워크 보안 그룹 설정
```bash
포트 22 (SSH): 관리용
포트 80 (HTTP): Let's Encrypt 인증서 발급용
포트 443 (HTTPS): 실제 서비스용
```

### 3단계: VM 접속 및 기본 설정
```bash
# VM에 SSH 접속
ssh azureuser@your-vm-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y git curl wget unzip htop

# 방화벽 설정
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 🚀 자동 배포 실행

### 1단계: 소스 코드 다운로드
```bash
git clone https://github.com/your-username/check-eat-backend.git
cd check-eat-backend
```

### 2단계: 환경 설정
```bash
# 환경 변수 파일 생성
cp .env.example .env

# 환경 변수 편집
nano .env
```

**필수 환경 변수 설정:**
```bash
# 데이터베이스
DB_NAME=checkeat
DB_PASSWORD=강력한_비밀번호_입력

# Redis
REDIS_PASSWORD=강력한_Redis_비밀번호

# JWT
JWT_SECRET=긴_JWT_시크릿_키_입력
JWT_ACCESS_SECRET=JWT_액세스_시크릿
JWT_RFRESH_SECRET=JWT_리프레시_시크릿

# Azure 서비스 (실제 키로 교체)
AZURE_STORAGE_STRING_FOOD=your_azure_storage_connection
AZURE_CV_ENDPOINT=your_azure_cv_endpoint
AZURE_AI_KEY_1=your_azure_ai_key

# 기타 서비스 키들...
```

### 3단계: 통합 배포 스크립트 실행
```bash
# 권한 부여
chmod +x gabia-deploy.sh

# 자동 배포 실행 (SSL 포함)
./gabia-deploy.sh -d api.your-domain.co.kr -e your-email@example.com

# 또는 SSL 없이 배포 (테스트용)
./gabia-deploy.sh -d api.your-domain.co.kr -e your-email@example.com --skip-ssl
```

배포 스크립트는 다음을 자동으로 수행합니다:
- ✅ Docker 및 Docker Compose 설치
- ✅ 필요한 디렉토리 생성
- ✅ 애플리케이션 빌드 및 컨테이너 시작
- ✅ 데이터베이스 마이그레이션
- ✅ SSL 인증서 자동 발급
- ✅ Nginx 리버스 프록시 설정
- ✅ 자동 SSL 갱신 설정

## 🔒 SSL 인증서 설정

### 자동 SSL 설정 (권장)
배포 스크립트가 자동으로 처리하지만, 수동으로도 가능합니다:

```bash
# SSL 설정 스크립트 실행
./ssl-setup.sh api.your-domain.co.kr your-email@example.com
```

### SSL 인증서 상태 확인
```bash
# 인증서 정보 확인
sudo docker-compose exec certbot certbot certificates

# 인증서 테스트 갱신
sudo docker-compose run --rm certbot certbot renew --dry-run
```

### 자동 갱신 확인
SSL 인증서는 매일 12:00에 자동으로 확인되고 필요시 갱신됩니다:

```bash
# 크론 작업 확인
crontab -l
```

## 🛠️ 서비스 관리

### 관리 명령어
```bash
# 서비스 상태 확인
./manage.sh status

# 애플리케이션 로그 확인
./manage.sh logs

# 실시간 로그 모니터링
./manage.sh logs-f

# 서비스 재시작
./manage.sh restart

# 헬스 체크
./manage.sh health

# 데이터베이스 백업
./manage.sh backup

# 애플리케이션 업데이트
./manage.sh update
```

### 직접 Docker 명령어
```bash
# 모든 서비스 상태 확인
docker-compose ps

# 특정 서비스 로그 확인
docker-compose logs nginx
docker-compose logs app
docker-compose logs postgres

# 서비스 재시작
docker-compose restart app

# 컨테이너 내부 접속
docker-compose exec app /bin/sh
docker-compose exec postgres psql -U postgres -d checkeat
```

## ✅ 배포 완료 후 확인사항

### 1. 서비스 접근 확인
```bash
# HTTPS 접근 확인
curl https://api.your-domain.co.kr/health

# API 문서 접근
# 브라우저에서 https://api.your-domain.co.kr/api 접속
```

### 2. SSL 등급 확인
[SSL Labs](https://www.ssllabs.com/ssltest/)에서 SSL 설정 품질을 확인할 수 있습니다.

### 3. 성능 모니터링
```bash
# 시스템 리소스 확인
htop

# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h
```

## 🔧 문제 해결

### DNS 관련 문제

**문제**: 도메인이 서버 IP로 연결되지 않음
```bash
# DNS 전파 확인
nslookup api.your-domain.co.kr
dig api.your-domain.co.kr

# 다른 DNS 서버에서 확인
nslookup api.your-domain.co.kr 8.8.8.8
```

**해결책**:
1. 가비아 DNS 설정 재확인
2. TTL 시간 대기 (최대 24시간)
3. 캐시 초기화: `sudo systemctl flush-dns`

### SSL 인증서 문제

**문제**: SSL 인증서 발급 실패
```bash
# Let's Encrypt 로그 확인
docker-compose logs certbot

# 도메인 접근성 테스트
curl -I http://api.your-domain.co.kr/.well-known/acme-challenge/
```

**해결책**:
1. 도메인 DNS 설정 재확인
2. 방화벽에서 포트 80 열려있는지 확인
3. 수동으로 SSL 재설정: `./ssl-setup.sh api.your-domain.co.kr your-email@example.com`

### 애플리케이션 문제

**문제**: 애플리케이션이 시작되지 않음
```bash
# 상세 로그 확인
./manage.sh logs

# 특정 서비스 상태 확인
docker-compose exec app npm run start:prod

# 데이터베이스 연결 확인
docker-compose exec postgres pg_isready -U postgres
```

**해결책**:
1. `.env` 파일의 환경 변수 확인
2. 데이터베이스 마이그레이션 실행: `./manage.sh migrate`
3. 서비스 재시작: `./manage.sh restart`

### 포트 접근 문제

**문제**: 외부에서 웹사이트 접근 안됨
```bash
# 포트 리스닝 상태 확인
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 방화벽 상태 확인
sudo ufw status
```

**해결책**:
1. Azure NSG에서 포트 80, 443 열기
2. Ubuntu 방화벽 확인: `sudo ufw allow 80` `sudo ufw allow 443`
3. Docker 네트워크 확인: `docker network ls`

## 📚 추가 자료

### 유용한 링크
- [가비아 DNS 설정 가이드](https://customer.gabia.com/manuals/dns/basic.php)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)
- [Docker Compose 문서](https://docs.docker.com/compose/)

### 백업 전략
```bash
# 매일 자동 백업 크론 설정
crontab -e

# 다음 라인 추가
0 2 * * * cd /path/to/check-eat-backend && ./manage.sh backup
```

### 모니터링 설정
```bash
# 시스템 모니터링 도구 설치
sudo apt install htop iotop nethogs

# 로그 로테이션 설정
sudo logrotate -d /etc/logrotate.conf
```

## 🎉 축하합니다!

가비아 도메인을 사용한 Check Eat Backend 배포가 완료되었습니다!

- 🌐 **애플리케이션**: https://api.your-domain.co.kr
- 📋 **API 문서**: https://api.your-domain.co.kr/api  
- 🏥 **헬스 체크**: https://api.your-domain.co.kr/health

추가 질문이나 문제가 있다면 GitHub Issues에 문의해주세요.