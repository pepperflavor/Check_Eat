#!/bin/bash

# Restore Script for Check Eat!
# This script restores database and files from backup

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

# Load environment variables
if [ -f .env ]; then
    source .env
else
    print_error ".env file not found!"
    exit 1
fi

# Parse command line arguments
DB_BACKUP_FILE=""
FILES_BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --db)
            DB_BACKUP_FILE="$2"
            shift 2
            ;;
        --files)
            FILES_BACKUP_FILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--db DB_BACKUP_FILE] [--files FILES_BACKUP_FILE]"
            echo ""
            echo "Options:"
            echo "  --db FILE     Database backup file to restore"
            echo "  --files FILE  Files backup file to restore"
            echo "  -h, --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --db backups/db_backup_20241201_120000.sql"
            echo "  $0 --files backups/files_backup_20241201_120000.tar.gz"
            echo "  $0 --db backups/db_backup_20241201_120000.sql --files backups/files_backup_20241201_120000.tar.gz"
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            exit 1
            ;;
    esac
done

if [ -z "$DB_BACKUP_FILE" ] && [ -z "$FILES_BACKUP_FILE" ]; then
    print_error "No backup files specified!"
    echo "Use --help for usage information"
    exit 1
fi

print_step "Starting restore process..."

# Database restore
if [ -n "$DB_BACKUP_FILE" ]; then
    if [ ! -f "$DB_BACKUP_FILE" ]; then
        print_error "Database backup file not found: $DB_BACKUP_FILE"
        exit 1
    fi
    
    print_step "Restoring database from $DB_BACKUP_FILE..."
    
    # Stop the application to prevent connections
    docker-compose stop app
    
    # Drop and recreate database
    print_warning "This will DROP the existing database. Continuing in 5 seconds..."
    sleep 5
    
    docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE $DB_NAME;"
    
    # Restore database
    docker-compose exec -T postgres psql -U postgres -d $DB_NAME < "$DB_BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        print_success "Database restored successfully"
    else
        print_error "Database restore failed"
        exit 1
    fi
    
    # Restart application
    docker-compose start app
fi

# Files restore
if [ -n "$FILES_BACKUP_FILE" ]; then
    if [ ! -f "$FILES_BACKUP_FILE" ]; then
        print_error "Files backup file not found: $FILES_BACKUP_FILE"
        exit 1
    fi
    
    print_step "Restoring files from $FILES_BACKUP_FILE..."
    
    # Backup existing uploads directory
    if [ -d "./uploads" ]; then
        mv uploads uploads_backup_$(date +%Y%m%d_%H%M%S)
        print_warning "Existing uploads directory backed up"
    fi
    
    # Extract files
    tar -xzf "$FILES_BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        print_success "Files restored successfully"
    else
        print_error "Files restore failed"
        exit 1
    fi
fi

print_success "Restore process completed"