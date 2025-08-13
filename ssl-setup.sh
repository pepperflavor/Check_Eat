#!/bin/bash

# 향상된 SSL Certificate 설정 스크립트 for Check Eat Backend
# 가비아 도메인과 Let's Encrypt SSL 인증서 설정
# Usage: ./ssl-setup.sh <domain> <email>

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

if [ $# -ne 2 ]; then
    echo -e "${BLUE}SSL Certificate Setup Script for Check Eat Backend${NC}"
    echo ""
    echo "Usage: $0 <domain> <email>"
    echo ""
    echo "Examples:"
    echo "  $0 api.example.com admin@example.com"
    echo "  $0 checkeat.co.kr admin@checkeat.co.kr"
    echo ""
    echo "Requirements:"
    echo "  - Domain must point to this server's IP address"
    echo "  - Ports 80 and 443 must be accessible"
    echo "  - Valid email address for Let's Encrypt registration"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

print_header "SSL Certificate Setup for $DOMAIN"

# Validate domain format
if [[ ! $DOMAIN =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    print_error "Invalid domain format: $DOMAIN"
    exit 1
fi

# Validate email format
if [[ ! $EMAIL =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
    print_error "Invalid email format: $EMAIL"
    exit 1
fi

# Check if domain resolves to this server
print_status "Checking domain resolution..."
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
DOMAIN_IP=$(nslookup $DOMAIN | grep -A1 "Name:" | tail -n1 | awk '{print $2}' 2>/dev/null || echo "unknown")

if [ "$SERVER_IP" != "unknown" ] && [ "$DOMAIN_IP" != "unknown" ]; then
    if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
        print_warning "Domain $DOMAIN resolves to $DOMAIN_IP, but server IP is $SERVER_IP"
        print_warning "Make sure your domain's A record points to $SERVER_IP"
        echo ""
        echo "가비아에서 DNS 설정 방법:"
        echo "1. 가비아 My가비아 로그인"
        echo "2. 서비스 관리 > DNS 관리 > DNS 설정"
        echo "3. A 레코드 설정: $DOMAIN -> $SERVER_IP"
        echo ""
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "DNS 설정 후 다시 실행해주세요."
            exit 1
        fi
    else
        print_status "✅ Domain resolution verified"
    fi
fi

# Create domain-specific nginx configuration
print_status "Creating SSL-enabled nginx configuration..."
# HTTPS server for $DOMAIN
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL configuration
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client max body size for file uploads
    client_max_body_size 50M;
    
    # Proxy settings
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-Host \$host;
    proxy_set_header X-Forwarded-Port \$server_port;
    
    # Connection settings
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_http_version 1.1;
    proxy_set_header Connection "";

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://check_eat_backend/health;
    }

    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization" always;
        
        if (\$request_method = 'OPTIONS') {
            add_header Content-Length 0;
            add_header Content-Type 'text/plain charset=UTF-8';
            return 204;
        }
        
        proxy_pass http://check_eat_backend;
    }
    
    # Auth endpoints with stricter rate limiting
    location ~ ^/(auth|login|register) {
        limit_req zone=login burst=10 nodelay;
        limit_req_status 429;
        
        proxy_pass http://check_eat_backend;
    }

    # Main application
    location / {
        proxy_pass http://check_eat_backend;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# Remove default nginx config to avoid conflicts
if [ -f "docker/nginx/conf.d/default.conf" ]; then
    print_status "Backing up and removing default nginx config..."
    mv docker/nginx/conf.d/default.conf docker/nginx/conf.d/default.conf.bak
fi

print_status "📝 Domain-specific nginx configuration created"

# Ensure services are running (without nginx first)
print_status "🔄 Starting base services (app, postgres, redis)..."
docker-compose up -d postgres redis app

# Wait for services to be healthy
print_status "⏳ Waiting for services to become healthy..."
sleep 30

# Test HTTP access for Let's Encrypt challenge
print_status "🔍 Testing HTTP access for certificate validation..."
docker-compose up -d nginx
sleep 10

# Get initial certificate
print_status "🔐 Obtaining SSL certificate from Let's Encrypt..."
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d $DOMAIN

if [ $? -ne 0 ]; then
    print_error "Failed to obtain SSL certificate"
    print_error "Please check:"
    print_error "1. Domain $DOMAIN points to this server"
    print_error "2. Ports 80 and 443 are accessible"
    print_error "3. No firewall blocking the domain"
    exit 1
fi

# Reload nginx with SSL configuration
print_status "🔄 Reloading nginx with SSL configuration..."
docker-compose exec nginx nginx -s reload

# Test HTTPS access
print_status "🧪 Testing HTTPS access..."
sleep 5
if curl -f -s https://$DOMAIN/health >/dev/null 2>&1; then
    print_status "✅ HTTPS is working correctly!"
else
    print_warning "HTTPS test failed, but certificate was issued"
    print_warning "Please check nginx logs: docker-compose logs nginx"
fi

print_header "SSL Certificate Setup Completed Successfully!"
echo ""
print_status "🌐 Your application is now available at: https://$DOMAIN"
print_status "📋 API documentation: https://$DOMAIN/api"
print_status "🏥 Health check: https://$DOMAIN/health"

# Set up automatic certificate renewal
print_status "⏰ Setting up automatic certificate renewal..."
CRON_COMMAND="0 12 * * * cd $(pwd) && docker-compose run --rm certbot renew --quiet && docker-compose exec nginx nginx -s reload > /dev/null 2>&1"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_COMMAND") | crontab -

print_status "📅 Automatic certificate renewal configured"
print_status "Certificates will be checked for renewal daily at 12:00 PM"

echo ""
print_header "Next Steps"
echo "1. 가비아 DNS가 올바르게 설정되었는지 확인"
echo "2. 애플리케이션이 정상 작동하는지 테스트"
echo "3. 방화벽에서 포트 80, 443이 열려있는지 확인"
echo ""
echo "유용한 명령어:"
echo "  ./manage.sh status    - 서비스 상태 확인"
echo "  ./manage.sh logs      - 애플리케이션 로그 확인"
echo "  ./manage.sh health    - 헬스 체크 실행"