#!/bin/bash

# Backup Script for Check Eat!
# This script creates backups of the database and uploads directory

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f .env ]; then
    source .env
else
    print_error ".env file not found!"
    exit 1
fi

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="db_backup_${DATE}.sql"
FILES_BACKUP_FILE="files_backup_${DATE}.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "Starting backup process..."

# Database backup
echo "Creating database backup..."
docker-compose exec -T postgres pg_dump -U postgres -d $DB_NAME > "$BACKUP_DIR/$DB_BACKUP_FILE"

if [ $? -eq 0 ]; then
    print_success "Database backup created: $DB_BACKUP_FILE"
else
    print_error "Database backup failed"
    exit 1
fi

# Files backup (uploads directory)
if [ -d "./uploads" ]; then
    echo "Creating files backup..."
    tar -czf "$BACKUP_DIR/$FILES_BACKUP_FILE" uploads/
    
    if [ $? -eq 0 ]; then
        print_success "Files backup created: $FILES_BACKUP_FILE"
    else
        print_warning "Files backup failed"
    fi
else
    print_warning "Uploads directory not found, skipping files backup"
fi

# Cleanup old backups (keep last 7 days)
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

print_success "Backup process completed"

echo ""
echo "Backup files created:"
echo "  Database: $BACKUP_DIR/$DB_BACKUP_FILE"
if [ -f "$BACKUP_DIR/$FILES_BACKUP_FILE" ]; then
    echo "  Files: $BACKUP_DIR/$FILES_BACKUP_FILE"
fi