#!/bin/bash

# Check Eat! Deployment Script
# This script sets up the complete Docker environment with SSL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=""
EMAIL=""
DB_PASSWORD=""
REDIS_PASSWORD=""

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Parse command line arguments
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
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --redis-password)
            REDIS_PASSWORD="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 -d DOMAIN -e EMAIL [OPTIONS]"
            echo "Options:"
            echo "  -d, --domain          Domain name (e.g., api.example.com)"
            echo "  -e, --email           Email for Let's Encrypt"
            echo "  --db-password         PostgreSQL password (auto-generated if not provided)"
            echo "  --redis-password      Redis password (auto-generated if not provided)"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    print_error "Domain and email are required!"
    echo "Usage: $0 -d DOMAIN -e EMAIL"
    exit 1
fi

print_step "Starting Check Eat! deployment for domain: $DOMAIN"

# Check prerequisites
print_step "Checking prerequisites..."
if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command_exists openssl; then
    print_error "OpenSSL is not installed. Please install OpenSSL first."
    exit 1
fi

print_success "Prerequisites check passed"

# Generate passwords if not provided
if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD=$(generate_password)
    print_success "Generated PostgreSQL password"
fi

if [ -z "$REDIS_PASSWORD" ]; then
    REDIS_PASSWORD=$(generate_password)
    print_success "Generated Redis password"
fi

# Create .env file
print_step "Creating environment configuration..."
cat > .env << EOF
# Database Configuration
DB_NAME=check_eat_db
DB_PASSWORD=$DB_PASSWORD

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD

# Domain Configuration
DOMAIN=$DOMAIN
EMAIL=$EMAIL

# Node Environment
NODE_ENV=production
EOF

print_success "Environment configuration created"

# Nginx configuration already set for summer-jin.store domain
print_step "Nginx configuration is ready for summer-jin.store domain"

# Create initial certificate (HTTP-01 challenge)
print_step "Creating initial SSL certificate..."
docker-compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email

if [ $? -eq 0 ]; then
    print_success "SSL certificate created successfully"
else
    print_warning "SSL certificate creation failed. Will use HTTP only for now."
fi

# Start services
print_step "Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
print_step "Waiting for services to be ready..."
sleep 30

# Run database migrations
print_step "Running database migrations..."
docker-compose exec app npx prisma migrate deploy

if [ $? -eq 0 ]; then
    print_success "Database migrations completed"
else
    print_warning "Database migrations failed. Please run manually: docker-compose exec app npx prisma migrate deploy"
fi

# Seed database (optional)
print_step "Seeding database..."
docker-compose exec app npm run seed || print_warning "Database seeding failed (this might be expected if already seeded)"

# Setup certificate renewal
print_step "Setting up certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * cd $(pwd) && docker-compose run --rm certbot renew --quiet && docker-compose restart nginx") | crontab -
print_success "Certificate auto-renewal setup completed"

# Display deployment information
echo ""
echo "========================================"
echo -e "${GREEN}DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo "========================================"
echo ""
echo "🌐 Domain: https://$DOMAIN"
echo "📊 API Documentation: https://$DOMAIN/api"
echo "🔧 Database: PostgreSQL with PostGIS"
echo "⚡ Cache: Redis"
echo "🔒 SSL: Let's Encrypt"
echo ""
echo "🔐 Generated Credentials:"
echo "   PostgreSQL Password: $DB_PASSWORD"
echo "   Redis Password: $REDIS_PASSWORD"
echo ""
echo "📝 Useful Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Restart services: docker-compose restart"
echo "   Stop services: docker-compose down"
echo "   Database shell: docker-compose exec postgres psql -U postgres -d check_eat_db"
echo ""
echo "⚠️  IMPORTANT: Save the generated passwords securely!"
echo "========================================"