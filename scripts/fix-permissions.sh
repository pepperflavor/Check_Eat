#!/bin/bash

# Docker Permissions Fix Script
# This script fixes common Docker permission issues on Ubuntu

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

echo "========================================"
echo -e "${GREEN}Docker Permissions Fix Script${NC}"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is not installed!"
    echo "Please install Docker first:"
    echo "curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "sudo sh get-docker.sh"
    exit 1
fi

# Check if user is already in docker group
if groups $USER | grep &>/dev/null '\bdocker\b'; then
    print_warning "User $USER is already in docker group"
else
    print_step "Adding user $USER to docker group..."
    sudo usermod -aG docker $USER
    print_success "User added to docker group"
fi

# Check Docker daemon status
print_step "Checking Docker daemon status..."
if sudo systemctl is-active --quiet docker; then
    print_success "Docker daemon is running"
else
    print_step "Starting Docker daemon..."
    sudo systemctl start docker
    sudo systemctl enable docker
    print_success "Docker daemon started and enabled"
fi

# Test Docker permissions
print_step "Testing Docker permissions..."
if docker version >/dev/null 2>&1; then
    print_success "Docker permissions are working correctly"
else
    print_warning "Docker permissions still not working"
    print_step "Applying temporary fix for current session..."
    
    # Apply new group membership for current shell
    newgrp docker << 'ENDDOCKERTEST'
    if docker version >/dev/null 2>&1; then
        echo -e "\033[0;32m[SUCCESS]\033[0m Docker permissions fixed for current session"
    else
        echo -e "\033[0;31m[ERROR]\033[0m Still having permission issues"
    fi
ENDDOCKERTEST

    print_warning "You may need to log out and log back in for permanent fix"
fi

# Check Docker Compose
print_step "Checking Docker Compose..."
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker-compose version --short)
    print_success "Docker Compose is installed (version: $COMPOSE_VERSION)"
else
    print_error "Docker Compose is not installed!"
    echo "Please install Docker Compose:"
    echo 'sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose'
    echo "sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}PERMISSION FIX COMPLETED${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. If this is your first time, please logout and login again"
echo "2. Or run: newgrp docker"
echo "3. Then continue with deployment:"
echo "   ./scripts/quick-deploy.sh -e your-email@summer-jin.store"
echo ""