# ---------- Build stage ----------
  FROM node:18-alpine AS builder
  WORKDIR /app
  
  # deps + prisma
  COPY package*.json ./
  COPY prisma ./prisma/
  RUN npm ci && npm cache clean --force
  
  # app source
  COPY . .
  
  # prisma generate (빌드 전에 반드시!)
  RUN npx prisma generate
  
  # build Nest (dist/main.js 생성)
  RUN npm run build
  
  
  # ---------- Production (runner) ----------
  FROM node:18-alpine AS production
  WORKDIR /app
  
  # signal handling
  RUN apk add --no-cache dumb-init
  
  # non-root user
  RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
  
  # prod deps만 설치
  COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
  RUN npm ci --only=production && npm cache clean --force
  
  # ---- 꼭 복사해야 하는 산출물들 ----
  # 1) 컴파일 산출물
  COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
  # 2) Prisma 스키마 (migrate/generate 등에 필요 시)
  COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
  # 3) Prisma 엔진
  COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
  # 4) *생성된* Prisma Client (@prisma/client) ← 중요
  COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
  
  USER nestjs
  EXPOSE 3000
  
  # healthcheck (원한다면 /health로 교체)
  HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
  
  ENTRYPOINT ["dumb-init", "--"]
  CMD ["node", "dist/main.js"]