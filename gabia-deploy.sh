#!/bin/bash

# 가비아 도메인용 Check Eat Backend 통합 배포 스크립트
# Azure VM + 가비아 도메인 + Let's Encrypt SSL + Nginx 리버스 프록시

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

show_help() {
    echo -e "${BLUE}가비아 도메인용 Check Eat Backend 배포 스크립트${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN    도메인 이름 (필수)"
    echo "  -e, --email EMAIL      SSL 인증서용 이메일 (필수)"
    echo "  --skip-ssl            SSL 설정 건너뛰기"
    echo "  --skip-migration      데이터베이스 마이그레이션 건너뛰기"
    echo "  --skip-seed           데이터베이스 시딩 건너뛰기"
    echo "  -h, --help            도움말 표시"
    echo ""
    echo "Examples:"
    echo "  $0 -d api.checkeat.co.kr -e admin@checkeat.co.kr"
    echo "  $0 -d myapi.co.kr -e me@myapi.co.kr --skip-seed"
    echo ""
    echo "가비아 DNS 설정 가이드:"
    echo "1. My가비아(https://my.gabia.com) 로그인"
    echo "2. 서비스 관리 > DNS 관리 > DNS 설정"
    echo "3. A 레코드 추가:"
    echo "   - 호스트: @ (또는 www, api 등 서브도메인)"
    echo "   - 값: 서버 IP 주소"
    echo "   - TTL: 3600"
}

# Parse command line arguments
DOMAIN=""
EMAIL=""
SKIP_SSL=false
SKIP_MIGRATION=false
SKIP_SEED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        --skip-ssl)
            SKIP_SSL=true
            shift
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check required parameters
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    print_error "도메인과 이메일은 필수 입력 사항입니다."
    show_help
    exit 1
fi

print_header "Check Eat Backend 가비아 도메인 배포 시작"
echo ""
print_status "도메인: $DOMAIN"
print_status "이메일: $EMAIL"
print_status "SSL 설정: $([ "$SKIP_SSL" = true ] && echo "건너뛰기" || echo "포함")"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "root 권한으로 실행하지 마세요"
    exit 1
fi

# Check .env file
if [ ! -f ".env" ]; then
    print_error ".env 파일이 없습니다. .env.example을 복사하여 설정하세요."
    exit 1
fi

print_status ".env 파일 확인됨"

# Check current server IP
print_status "서버 IP 주소 확인 중..."
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
if [ "$SERVER_IP" != "unknown" ]; then
    print_status "현재 서버 IP: $SERVER_IP"
    echo ""
    print_warning "가비아 DNS 설정 확인:"
    echo "1. https://my.gabia.com 로그인"
    echo "2. 서비스 관리 > DNS 관리 > DNS 설정"
    echo "3. A 레코드: $DOMAIN -> $SERVER_IP"
    echo ""
    read -p "DNS 설정이 완료되었습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "DNS 설정 완료 후 다시 실행해주세요."
        exit 0
    fi
fi

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    print_status "Docker 설치 중..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker 설치 완료. 다시 로그인하여 실행하세요."
    exit 0
fi

# Install Docker Compose if needed
if ! command -v docker-compose &> /dev/null; then
    print_status "Docker Compose 설치 중..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose 설치 완료"
fi

# Create necessary directories
print_status "필요한 디렉토리 생성 중..."
mkdir -p uploads
mkdir -p docker/nginx/conf.d
mkdir -p docker/certbot/conf
mkdir -p docker/certbot/www

# Build and start base services
print_status "애플리케이션 빌드 및 기본 서비스 시작 중..."
docker-compose down --remove-orphans
docker-compose build --no-cache app
docker-compose up -d postgres redis app

# Wait for services
print_status "서비스 헬스 체크 대기 중..."
timeout=300
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose exec postgres pg_isready -U postgres -q; then
        break
    fi
    sleep 10
    counter=$((counter + 10))
    echo "대기 중... ($counter/$timeout seconds)"
done

if [ $counter -eq $timeout ]; then
    print_error "서비스가 시작되지 않았습니다."
    docker-compose logs
    exit 1
fi

print_status "기본 서비스 시작 완료!"

# Run database migrations
if [ "$SKIP_MIGRATION" = false ]; then
    print_status "데이터베이스 마이그레이션 실행 중..."
    docker-compose exec -T app npx prisma migrate deploy
    print_status "마이그레이션 완료"
fi

# Run database seeding
if [ "$SKIP_SEED" = false ]; then
    read -p "데이터베이스 시딩을 실행하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "데이터베이스 시딩 실행 중..."
        docker-compose exec -T app npm run seed
        print_status "시딩 완료"
    fi
fi

# Setup SSL certificate
if [ "$SKIP_SSL" = false ]; then
    print_header "SSL 인증서 설정"
    ./ssl-setup.sh "$DOMAIN" "$EMAIL"
else
    print_status "SSL 설정을 건너뛰고 HTTP로만 시작합니다..."
    docker-compose up -d nginx
fi

print_header "배포 완료!"
echo ""
if [ "$SKIP_SSL" = false ]; then
    print_status "🌐 애플리케이션: https://$DOMAIN"
    print_status "📋 API 문서: https://$DOMAIN/api"
    print_status "🏥 헬스 체크: https://$DOMAIN/health"
else
    print_status "🌐 애플리케이션: http://$DOMAIN"
    print_status "📋 API 문서: http://$DOMAIN/api"
    print_status "🏥 헬스 체크: http://$DOMAIN/health"
fi

print_status "📊 서비스 상태: ./manage.sh status"
print_status "📝 로그 확인: ./manage.sh logs"

echo ""
print_header "중요 사항"
echo "1. 가비아 DNS 전파에는 최대 24시간이 소요될 수 있습니다"
echo "2. SSL 인증서는 매일 12:00에 자동 갱신됩니다"
echo "3. 방화벽에서 포트 80, 443이 열려있는지 확인하세요"
echo ""
echo "문제 해결:"
echo "  - DNS 확인: nslookup $DOMAIN"
echo "  - 포트 확인: netstat -tlnp | grep :80"
echo "  - 서비스 로그: ./manage.sh logs"