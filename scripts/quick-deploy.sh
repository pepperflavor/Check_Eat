#!/bin/bash

# Quick Deployment Script for summer-jin.store
# This script provides a simplified deployment with pre-configured domain

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

# Pre-configured for summer-jin.store
DOMAIN="summer-jin.store"
EMAIL=""

# Parse email argument
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 -e EMAIL"
            echo "Quick deployment script for summer-jin.store domain"
            echo ""
            echo "Options:"
            echo "  -e, --email    Email for Let's Encrypt SSL certificate"
            echo "  -h, --help     Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 -e admin@summer-jin.store"
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            echo "Use -h for help"
            exit 1
            ;;
    esac
done

if [ -z "$EMAIL" ]; then
    print_error "Email is required for SSL certificate!"
    echo "Usage: $0 -e your-email@summer-jin.store"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}Check Eat! Quick Deployment${NC}"
echo -e "${BLUE}Domain: summer-jin.store${NC}"
echo -e "${BLUE}Email: $EMAIL${NC}"
echo "========================================"
echo ""

# Run main deployment script with pre-configured domain
./scripts/deploy.sh -d "$DOMAIN" -e "$EMAIL"