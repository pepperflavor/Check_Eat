#!/bin/bash

# Manual SSL Setup Script
# Use this if the main deployment script SSL setup fails

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

DOMAIN="summer-jin.store"
EMAIL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -h|--help)
            echo "Manual SSL Certificate Setup for summer-jin.store"
            echo "Usage: $0 -e EMAIL"
            echo ""
            echo "This script manually creates SSL certificate when main deployment fails"
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            exit 1
            ;;
    esac
done

if [ -z "$EMAIL" ]; then
    print_error "Email is required!"
    echo "Usage: $0 -e your-email@summer-jin.store"
    exit 1
fi

echo "========================================"
echo -e "${GREEN}Manual SSL Setup for summer-jin.store${NC}"
echo "========================================"

# Check if services are running
print_step "Checking if Docker services are running..."
if ! docker-compose ps | grep -q "Up"; then
    print_step "Starting necessary services..."
    docker-compose up -d postgres redis app
    sleep 20
fi

# Create temporary HTTP-only nginx config
print_step "Creating temporary HTTP-only configuration..."
cp docker/nginx/conf.d/default.conf docker/nginx/conf.d/default.conf.backup

cat > docker/nginx/conf.d/default.conf << 'EOF'
upstream check_eat_backend {
    server app:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name summer-jin.store www.summer-jin.store;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri $uri/ =404;
    }
    
    location / {
        proxy_pass http://check_eat_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Start/restart nginx
print_step "Starting nginx with HTTP-only configuration..."
docker-compose up -d nginx
sleep 5

# Request certificate
print_step "Requesting SSL certificate from Let's Encrypt..."
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot/ \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --force-renewal

if [ $? -eq 0 ]; then
    print_success "SSL certificate obtained successfully!"
    
    # Restore full nginx configuration
    print_step "Restoring full nginx configuration with SSL..."
    mv docker/nginx/conf.d/default.conf.backup docker/nginx/conf.d/default.conf
    
    # Restart nginx to load SSL
    docker-compose restart nginx
    
    print_success "SSL setup completed!"
    
    echo ""
    echo "✅ Your site should now be accessible at:"
    echo "   https://summer-jin.store"
    echo "   https://www.summer-jin.store"
    
else
    print_error "SSL certificate request failed!"
    print_step "Restoring original configuration..."
    mv docker/nginx/conf.d/default.conf.backup docker/nginx/conf.d/default.conf
    docker-compose restart nginx
    
    echo ""
    echo "❌ SSL setup failed. Your site is still accessible via HTTP:"
    echo "   http://summer-jin.store"
    echo ""
    echo "Common issues:"
    echo "1. Domain not pointing to this server"
    echo "2. Port 80 blocked by firewall"
    echo "3. Another service using port 80"
    echo ""
    echo "Check with: curl -I http://summer-jin.store/.well-known/acme-challenge/test"
fi