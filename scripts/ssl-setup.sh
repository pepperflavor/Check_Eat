#!/bin/bash

# SSL Certificate Setup Script for Check Eat!
# This script handles SSL certificate creation and renewal

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    source .env
else
    print_error ".env file not found! Please run deploy.sh first."
    exit 1
fi

case "$1" in
    "init")
        print_step "Initializing SSL certificate for $DOMAIN..."
        
        # Create temporary nginx config without SSL
        cp docker/nginx/conf.d/default.conf docker/nginx/conf.d/default.conf.ssl
        
        # Create HTTP-only config
        cat > docker/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name api.summer-jin.store;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
        
        # Domain already set to api.summer-jin.store
        
        # Start services without SSL
        docker-compose up -d nginx
        
        # Wait for nginx to be ready
        sleep 10
        
        # Request certificate
        docker-compose run --rm certbot certonly \
            --webroot \
            --webroot-path /var/www/certbot/ \
            -d $DOMAIN \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            --force-renewal
            
        if [ $? -eq 0 ]; then
            # Restore SSL configuration
            mv docker/nginx/conf.d/default.conf.ssl docker/nginx/conf.d/default.conf
            docker-compose restart nginx
            print_success "SSL certificate created and activated"
        else
            print_error "SSL certificate creation failed"
            exit 1
        fi
        ;;
        
    "renew")
        print_step "Renewing SSL certificate..."
        docker-compose run --rm certbot renew --quiet
        docker-compose restart nginx
        print_success "SSL certificate renewed"
        ;;
        
    "force-renew")
        print_step "Force renewing SSL certificate..."
        docker-compose run --rm certbot renew --force-renewal
        docker-compose restart nginx
        print_success "SSL certificate force renewed"
        ;;
        
    "check")
        print_step "Checking SSL certificate..."
        docker-compose run --rm certbot certificates
        ;;
        
    *)
        echo "Usage: $0 {init|renew|force-renew|check}"
        echo ""
        echo "Commands:"
        echo "  init         - Create initial SSL certificate"
        echo "  renew        - Renew existing certificate"
        echo "  force-renew  - Force renew certificate"
        echo "  check        - Check certificate status"
        exit 1
        ;;
esac