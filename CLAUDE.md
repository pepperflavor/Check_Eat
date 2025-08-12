# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Check Eat! is a multilingual food review platform built with NestJS, focusing on food safety for users with dietary restrictions (vegan, halal, allergies). The application provides food recognition, OCR receipt processing, and multilingual support (Korean, English, Arabic).

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Development server with hot reload
npm run start:dev

# Build the application
npm run build

# Production start
npm run start:prod

# Format code
npm run format

# Lint and fix code
npm run lint

# Run tests
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e

# Database operations
npm run seed              # Seed database with initial data
npx prisma migrate dev    # Run database migrations
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open Prisma Studio GUI
```

## Architecture Overview

### Core Technologies
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport strategies
- **Caching**: Redis with cache-manager
- **File Storage**: Azure Blob Storage
- **AI Services**: Azure Cognitive Services (OCR, Food Recognition)
- **Queue Processing**: Bull with Redis
- **API Documentation**: Swagger

### Module Structure
```
src/
├── auth/                    # JWT authentication, local/refresh strategies
├── user/                    # User management, profiles, preferences
├── sajang/                  # Restaurant owner (business) management
├── review/                  # Food reviews with multilingual support
├── azure-storage/           # Azure Blob Storage services
├── azure-document-ocr/      # Receipt OCR processing
├── azure-food-classifier/   # Food classification AI
├── azure-food-recognizer/   # Food recognition and inference
├── cache/                   # Redis caching services
├── email/                   # SendGrid email services
├── translate/               # Multilingual translation
├── portone/                 # Identity verification services
└── prisma.service.ts        # Database service
```

### Database Architecture
The Prisma schema defines a complex multilingual food platform:

- **User Management**: Users, LoginData, IdentityVerification
- **Business**: Sajang (restaurant owners), Store, Holiday
- **Food System**: Food, FoodTranslateEN/AR with multilingual support
- **Reviews**: Review, ReviewTranslateEN/AR, ReviewImage
- **Dietary Restrictions**: Vegan levels, CommonAl (allergies), Halal certification
- **Relationships**: Many-to-many between foods/allergies, users/favorite stores

### Key Features
- **Multilingual Support**: Korean (ko), English (en), Arabic (ar) throughout the platform
- **Food Safety**: Comprehensive allergy tracking, vegan levels, halal certification
- **AI Integration**: OCR for receipt processing, food recognition, automated classification
- **Business Integration**: Restaurant owner portal with business verification
- **Identity Verification**: PortOne integration for Korean identity verification

### Authentication Flow
- JWT-based with access/refresh token strategy
- Multiple providers: local, Apple login
- Role-based access: regular users (0) vs business owners (1)
- Identity verification required for business accounts

### File Upload Strategy
All file uploads go through Azure Blob Storage with dedicated services:
- `user-storage.service.ts`: Profile images
- `food-storage.service.ts`: Food images
- `ocr-storage.service.ts`: Receipt images
- `review-storage.service.ts`: Review images
- `store-storage.service.ts`: Restaurant images

### API Structure
- All endpoints documented with Swagger at `/api`
- Global validation pipes with class-validator
- CORS enabled
- Global exception filters
- Runs on port 3000 with PM2 cluster support

### Cache Strategy
Redis-based caching for:
- Food recognition results
- Translation cache
- User session data
- Frequently accessed restaurant data

## Important Notes
- Environment variables required for Azure services, database, and external APIs
- Database migrations managed through Prisma
- Comprehensive test coverage expected for all modules
- Korean comments throughout codebase - business domain is Korea-focused
- PM2 deployment configuration with cluster mode support