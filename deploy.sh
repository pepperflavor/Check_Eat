#!/bin/bash

# Azure VM Deployment Script for Check Eat Backend
# This script sets up the application on Azure VM with Docker

set -e  # Exit on any error

echo "🚀 Starting Check Eat Backend deployment on Azure VM..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}Please do not run this script as root${NC}"
    exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

print_status "Found .env file"

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_status "Docker installed successfully"
else
    print_status "Docker is already installed"
fi

# Install Docker Compose if not already installed
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_status "Docker Compose installed successfully"
else
    print_status "Docker Compose is already installed"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads
mkdir -p docker/nginx/conf.d
mkdir -p docker/certbot/conf
mkdir -p docker/certbot/www

# Create nginx configuration if it doesn't exist
if [ ! -f "docker/nginx/nginx.conf" ]; then
    print_status "Creating nginx configuration..."
    cat > docker/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }
    
    server {
        listen 80;
        server_name _;
        
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        location / {
            return 301 https://$host$request_uri;
        }
    }
    
    server {
        listen 443 ssl http2;
        server_name _;
        
        ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /health {
            proxy_pass http://app/health;
        }
    }
}
EOF
fi

# Build and start services
print_status "Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
print_status "Waiting for services to become healthy..."
timeout=300
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose ps | grep -q "healthy"; then
        break
    fi
    sleep 10
    counter=$((counter + 10))
    echo "Waiting... ($counter/$timeout seconds)"
done

if [ $counter -eq $timeout ]; then
    print_error "Services failed to become healthy within $timeout seconds"
    docker-compose logs
    exit 1
fi

print_status "Services are healthy!"

# Run database migrations
print_status "Running database migrations..."
docker-compose exec -T app npx prisma migrate deploy

# Optional: Run database seeding
read -p "Do you want to run database seeding? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running database seeding..."
    docker-compose exec -T app npm run seed
fi

print_status "✅ Deployment completed successfully!"
print_status "Your application should be available at the configured domain"
print_status "Check service status with: docker-compose ps"
print_status "View logs with: docker-compose logs -f"

echo ""
print_warning "Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Update nginx.conf with your actual domain name"
echo "3. Run SSL certificate setup: ./ssl-setup.sh your-domain.com your-email@example.com"