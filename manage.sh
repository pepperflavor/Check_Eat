#!/bin/bash

# Management Script for Check Eat Backend on Azure VM

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_help() {
    echo -e "${BLUE}Check Eat Backend Management Script${NC}"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start         Start all services"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  status        Show service status"
    echo "  logs          Show application logs"
    echo "  logs-f        Follow application logs"
    echo "  update        Update application (git pull + rebuild)"
    echo "  migrate       Run database migrations"
    echo "  seed          Run database seeding"
    echo "  backup        Create database backup"
    echo "  restore       Restore database from backup"
    echo "  clean         Clean up old images and volumes"
    echo "  health        Check application health"
    echo "  shell         Open shell in app container"
    echo "  psql          Open PostgreSQL shell"
    echo "  redis-cli     Open Redis CLI"
    echo "  help          Show this help message"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_env() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found. Please configure your environment variables."
        exit 1
    fi
}

case "${1:-help}" in
    "start")
        check_env
        print_status "Starting Check Eat Backend services..."
        docker-compose up -d
        print_status "Services started successfully"
        ;;
    
    "stop")
        print_status "Stopping Check Eat Backend services..."
        docker-compose down
        print_status "Services stopped successfully"
        ;;
    
    "restart")
        check_env
        print_status "Restarting Check Eat Backend services..."
        docker-compose down
        docker-compose up -d
        print_status "Services restarted successfully"
        ;;
    
    "status")
        print_status "Service Status:"
        docker-compose ps
        ;;
    
    "logs")
        docker-compose logs app
        ;;
    
    "logs-f")
        print_status "Following application logs (Press Ctrl+C to exit)..."
        docker-compose logs -f app
        ;;
    
    "update")
        print_status "Updating Check Eat Backend..."
        print_status "Pulling latest changes..."
        git pull
        
        print_status "Rebuilding application..."
        docker-compose build --no-cache app
        
        print_status "Restarting services..."
        docker-compose up -d
        
        print_status "Running migrations..."
        docker-compose exec -T app npx prisma migrate deploy
        
        print_status "Update completed successfully"
        ;;
    
    "migrate")
        check_env
        print_status "Running database migrations..."
        docker-compose exec app npx prisma migrate deploy
        print_status "Migrations completed successfully"
        ;;
    
    "seed")
        check_env
        print_status "Running database seeding..."
        docker-compose exec app npm run seed
        print_status "Seeding completed successfully"
        ;;
    
    "backup")
        check_env
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        print_status "Creating database backup: $BACKUP_FILE"
        docker-compose exec postgres pg_dump -U postgres -d checkeat > "$BACKUP_FILE"
        print_status "Database backup created: $BACKUP_FILE"
        ;;
    
    "restore")
        if [ -z "$2" ]; then
            print_error "Usage: $0 restore <backup_file.sql>"
            exit 1
        fi
        
        if [ ! -f "$2" ]; then
            print_error "Backup file $2 not found"
            exit 1
        fi
        
        print_warning "This will overwrite the current database. Are you sure? (y/N)"
        read -r confirmation
        if [[ $confirmation =~ ^[Yy]$ ]]; then
            print_status "Restoring database from $2..."
            docker-compose exec -T postgres psql -U postgres -d checkeat < "$2"
            print_status "Database restored successfully"
        else
            print_status "Restore cancelled"
        fi
        ;;
    
    "clean")
        print_status "Cleaning up old Docker images and volumes..."
        docker system prune -f
        docker volume prune -f
        print_status "Cleanup completed"
        ;;
    
    "health")
        print_status "Checking application health..."
        
        # Check if services are running
        if ! docker-compose ps | grep -q "Up"; then
            print_error "Services are not running"
            exit 1
        fi
        
        # Check application health endpoint
        if command -v curl &> /dev/null; then
            if curl -f http://localhost/health >/dev/null 2>&1; then
                print_status "✅ Application is healthy"
            else
                print_error "❌ Application health check failed"
                exit 1
            fi
        else
            print_warning "curl not available, skipping HTTP health check"
        fi
        
        # Check database connection
        if docker-compose exec postgres pg_isready -U postgres >/dev/null 2>&1; then
            print_status "✅ Database is healthy"
        else
            print_error "❌ Database health check failed"
            exit 1
        fi
        
        # Check Redis connection
        if docker-compose exec redis redis-cli ping >/dev/null 2>&1; then
            print_status "✅ Redis is healthy"
        else
            print_error "❌ Redis health check failed"
            exit 1
        fi
        ;;
    
    "shell")
        print_status "Opening shell in application container..."
        docker-compose exec app /bin/sh
        ;;
    
    "psql")
        print_status "Opening PostgreSQL shell..."
        docker-compose exec postgres psql -U postgres -d checkeat
        ;;
    
    "redis-cli")
        print_status "Opening Redis CLI..."
        docker-compose exec redis redis-cli
        ;;
    
    "help"|*)
        print_help
        ;;
esac