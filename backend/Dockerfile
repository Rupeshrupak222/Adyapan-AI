FROM node:22-bookworm-slim

# OpenSSL + CA certs for Prisma/HTTPS. glibc base (not Alpine) so native
# prebuilds for bcrypt/sharp work without a musl rebuild.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skip Puppeteer Chromium download — we don't need a browser in production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Copy dependency specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (Chromium skipped via env vars above)
RUN npm ci --omit=dev --ignore-scripts \
    && npm rebuild bcrypt --build-from-source \
    && npm rebuild sharp

# Generate Prisma Clients
RUN npx prisma generate
RUN npx prisma generate --schema=prisma/schema.user.prisma

# Copy application source code
COPY . .

# Compile TypeScript
RUN npm run build

ENV NODE_ENV=production

# PORT is injected by Railway at runtime
CMD ["node", "--max-old-space-size=900", "dist/index.js"]
