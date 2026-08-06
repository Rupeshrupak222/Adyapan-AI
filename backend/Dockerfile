FROM node:22-bookworm-slim

# OpenSSL + CA certs for Prisma/HTTPS + Python/make/g++ for native modules (bcrypt, sharp)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       openssl ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skip Puppeteer Chromium download — we don't need a browser in production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy dependency specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDeps needed for tsc build)
RUN npm ci

# Generate Prisma Clients
RUN npx prisma generate
RUN npx prisma generate --schema=prisma/schema.user.prisma

# Copy application source code
COPY . .

# Compile TypeScript
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --omit=dev

ENV NODE_ENV=production

# PORT is injected by Railway at runtime
CMD ["node", "--max-old-space-size=900", "dist/index.js"]
