# Check Eat! Backend - Ubuntu Deployment Guide

Complete Docker deployment setup with Nginx, SSL, PostgreSQL with PostGIS, and Redis.

## Prerequisites

### System Requirements
- Ubuntu 20.04 LTS or later
- 2+ GB RAM
- 20+ GB disk space
- Domain name pointing to your server IP

### Software Requirements
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group membership
```

## Quick Deployment

### 1. Clone and Setup
```bash
git clone <your-repo-url> check-eat-backend
cd check-eat-backend
```

### 2. Configure Environment
```bash
# Copy environment example
cp .env.example .env

# Edit .env file with your values
nano .env
```

### 3. Deploy with SSL
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run deployment for summer-jin.store
./scripts/deploy.sh -d summer-jin.store -e your-email@summer-jin.store
```

## Manual Setup

### 1. Environment Configuration
Create `.env` file with required variables:
```bash
# Copy and modify
cp .env.example .env
```

Key variables to set:
- `DOMAIN`: Your domain name
- `EMAIL`: Email for Let's Encrypt
- `DB_PASSWORD`: PostgreSQL password
- `REDIS_PASSWORD`: Redis password
- `JWT_SECRET`: JWT secret key
- Azure and other service credentials

### 2. Domain Configuration
Update Nginx configuration:
```bash
# Nginx configuration is already set for summer-jin.store domain
# No manual editing needed
```

### 3. Start Services
```bash
# Start without SSL first
docker-compose up -d postgres redis app

# Wait for services to be ready
sleep 30

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Setup SSL certificate
./scripts/ssl-setup.sh init

# Start nginx with SSL
docker-compose up -d nginx
```

## Service Architecture

### Services Overview
- **app**: NestJS application (port 3000 internal)
- **postgres**: PostgreSQL with PostGIS extensions
- **redis**: Redis cache with password authentication
- **nginx**: Reverse proxy with SSL termination
- **certbot**: Automatic SSL certificate management

### Port Mapping
- **80**: HTTP (redirects to HTTPS)
- **443**: HTTPS (main application)
- **5432**: PostgreSQL (internal access only)
- **6379**: Redis (internal access only)

### Data Persistence
- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `./uploads`: File uploads (mounted volume)
- `./docker/certbot/conf`: SSL certificates

## SSL Certificate Management

### Initial Setup
```bash
# Create initial certificate
./scripts/ssl-setup.sh init
```

### Renewal
```bash
# Check certificate status
./scripts/ssl-setup.sh check

# Renew certificate
./scripts/ssl-setup.sh renew

# Force renewal
./scripts/ssl-setup.sh force-renew
```

### Automatic Renewal
Cron job is automatically configured to renew certificates:
```bash
# Check cron
crontab -l

# Manual cron setup if needed
(crontab -l; echo "0 12 * * * cd /path/to/project && ./scripts/ssl-setup.sh renew") | crontab -
```

## Database Management

### Migrations
```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
docker-compose exec app npx prisma generate

# Database studio (development only)
docker-compose exec app npx prisma studio
```

### Database Access
```bash
# PostgreSQL shell
docker-compose exec postgres psql -U postgres -d check_eat_db

# Check PostGIS extensions
docker-compose exec postgres psql -U postgres -d check_eat_db -c "SELECT name, default_version FROM pg_available_extensions WHERE name LIKE 'postgis%';"
```

## Backup and Restore

### Create Backup
```bash
# Full backup (database + files)
./scripts/backup.sh
```

### Restore Backup
```bash
# Restore database only
./scripts/restore.sh --db backups/db_backup_20241201_120000.sql

# Restore files only
./scripts/restore.sh --files backups/files_backup_20241201_120000.tar.gz

# Restore both
./scripts/restore.sh --db backups/db_backup_20241201_120000.sql --files backups/files_backup_20241201_120000.tar.gz
```

## Monitoring and Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f postgres
```

### Service Management
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app

# Stop services
docker-compose down

# Stop and remove volumes (DANGER: data loss)
docker-compose down -v
```

### Health Checks
- Application: `https://summer-jin.store/health`
- API Documentation: `https://summer-jin.store/api`

### Performance Monitoring
```bash
# Container stats
docker stats

# System resources
htop
df -h
```

## Security Considerations

### Firewall Setup
```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Environment Security
- Use strong passwords for database and Redis
- Keep `.env` file secure and never commit to version control
- Regularly update Docker images
- Monitor logs for suspicious activity

### SSL Security
- A+ rating SSL configuration included
- HSTS headers enabled
- Modern TLS protocols only (1.2, 1.3)
- Security headers configured

## Troubleshooting

### Common Issues

#### SSL Certificate Issues
```bash
# Check certificate status
./scripts/ssl-setup.sh check

# Recreate certificate
./scripts/ssl-setup.sh init
```

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres
```

#### Application Issues
```bash
# Check application logs
docker-compose logs app

# Restart application
docker-compose restart app
```

### Log Locations
- Application logs: `docker-compose logs app`
- Nginx logs: `docker-compose logs nginx`
- PostgreSQL logs: `docker-compose logs postgres`
- SSL logs: `docker-compose logs certbot`

## Updates and Maintenance

### Application Updates
```bash
# Pull latest code
git pull origin main

# Rebuild and deploy
docker-compose build app
docker-compose up -d app

# Run new migrations if any
docker-compose exec app npx prisma migrate deploy
```

### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```