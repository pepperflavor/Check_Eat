# Azure VM 배포 가이드

Check Eat Backend를 Azure VM에 Docker를 통해 배포하는 방법을 안내합니다.

## 사전 요구사항

- Azure VM (Ubuntu 20.04 LTS 권장)
- SSH 접근 권한
- 도메인 (선택사항, SSL 인증서용)

## 1. Azure VM 준비

### VM 생성 및 기본 설정

```bash
# VM에 SSH 접속
ssh azureuser@your-vm-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y git curl wget unzip
```

### 방화벽 설정

```bash
# HTTP, HTTPS 포트 열기
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22  # SSH
sudo ufw enable
```

## 2. 프로젝트 설정

### 소스 코드 클론

```bash
git clone https://github.com/your-username/check-eat-backend.git
cd check-eat-backend
```

### 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 환경변수 편집 (필수!)
nano .env
```

**중요한 환경변수:**
- `DB_NAME`: 데이터베이스 이름 (기본값: checkeat)
- `DB_PASSWORD`: PostgreSQL 비밀번호
- `REDIS_PASSWORD`: Redis 비밀번호
- `JWT_SECRET`: JWT 시크릿 키
- Azure 서비스 관련 키들
- 도메인 설정

## 3. 배포 실행

### 자동 배포 스크립트 실행

```bash
# 배포 스크립트 실행
./deploy.sh
```

이 스크립트는 다음을 수행합니다:
- Docker 및 Docker Compose 설치
- 필요한 디렉토리 생성
- 서비스 빌드 및 시작
- 데이터베이스 마이그레이션 실행

## 4. SSL 인증서 설정 (선택사항)

도메인이 있는 경우 SSL 인증서를 설정할 수 있습니다:

```bash
# SSL 설정 스크립트 실행
./ssl-setup.sh your-domain.com your-email@example.com
```

## Manual Setup

### 1. Environment Configuration
Create `.env` file with required variables:
```bash
# Copy and modify
cp .env.example .env
```

Key variables to set:
- `DOMAIN`: Your domain name
- `EMAIL`: Email for Let's Encrypt
- `DB_PASSWORD`: PostgreSQL password
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: JWT secret key
- Azure and other service credentials

### 2. Domain Configuration
Update Nginx configuration:
```bash
# Nginx configuration is already set for summer-jin.store domain
# No manual editing needed
```

### 3. Start Services
```bash
# Start without SSL first
docker-compose up -d postgres redis app

# Wait for services to be ready
sleep 30

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Setup SSL certificate
./scripts/ssl-setup.sh init

# Start nginx with SSL
docker-compose up -d nginx
```

## Service Architecture

### Services Overview
- **app**: NestJS application (port 3000 internal)
- **postgres**: PostgreSQL with PostGIS extensions
- **redis**: Redis cache with password authentication
- **nginx**: Reverse proxy with SSL termination
- **certbot**: Automatic SSL certificate management

### Port Mapping
- **80**: HTTP (redirects to HTTPS)
- **443**: HTTPS (main application)
- **5432**: PostgreSQL (internal access only)
- **6379**: Redis (internal access only)

### Data Persistence
- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `./uploads`: File uploads (mounted volume)
- `./docker/certbot/conf`: SSL certificates

## SSL Certificate Management

### Initial Setup
```bash
# Create initial certificate
./scripts/ssl-setup.sh init
```

### Renewal
```bash
# Check certificate status
./scripts/ssl-setup.sh check

# Renew certificate
./scripts/ssl-setup.sh renew

# Force renewal
./scripts/ssl-setup.sh force-renew
```

### Automatic Renewal
Cron job is automatically configured to renew certificates:
```bash
# Check cron
crontab -l

# Manual cron setup if needed
(crontab -l; echo "0 12 * * * cd /path/to/project && ./scripts/ssl-setup.sh renew") | crontab -
```

## Database Management

### Migrations
```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
docker-compose exec app npx prisma generate

# Database studio (development only)
docker-compose exec app npx prisma studio
```

### Database Access
```bash
# PostgreSQL shell
docker-compose exec postgres psql -U postgres -d check_eat_db

# Check PostGIS extensions
docker-compose exec postgres psql -U postgres -d check_eat_db -c "SELECT name, default_version FROM pg_available_extensions WHERE name LIKE 'postgis%';"
```

## Backup and Restore

### Create Backup
```bash
# Full backup (database + files)
./scripts/backup.sh
```

### Restore Backup
```bash
# Restore database only
./scripts/restore.sh --db backups/db_backup_20241201_120000.sql

# Restore files only
./scripts/restore.sh --files backups/files_backup_20241201_120000.tar.gz

# Restore both
./scripts/restore.sh --db backups/db_backup_20241201_120000.sql --files backups/files_backup_20241201_120000.tar.gz
```

## Monitoring and Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f postgres
```

### Service Management
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app

# Stop services
docker-compose down

# Stop and remove volumes (DANGER: data loss)
docker-compose down -v
```

### Health Checks
- Application: `https://summer-jin.store/health`
- API Documentation: `https://summer-jin.store/api`

### Performance Monitoring
```bash
# Container stats
docker stats

# System resources
htop
df -h
```

## Security Considerations

### Firewall Setup
```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Environment Security
- Use strong passwords for database and Redis
- Keep `.env` file secure and never commit to version control
- Regularly update Docker images
- Monitor logs for suspicious activity

### SSL Security
- A+ rating SSL configuration included
- HSTS headers enabled
- Modern TLS protocols only (1.2, 1.3)
- Security headers configured

## Troubleshooting

### Common Issues

#### SSL Certificate Issues
```bash
# Check certificate status
./scripts/ssl-setup.sh check

# Recreate certificate
./scripts/ssl-setup.sh init
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres
```

#### Application Issues
```bash
# Check application logs
docker-compose logs app

# Restart application
docker-compose restart app
```

### Log Locations
- Application logs: `docker-compose logs app`
- Nginx logs: `docker-compose logs nginx`
- PostgreSQL logs: `docker-compose logs postgres`
- SSL logs: `docker-compose logs certbot`

## Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
docker-compose build app
docker-compose up -d app

# Run new migrations if any
docker-compose exec app npx prisma migrate deploy
```

### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```