FROM node:22-bookworm-slim

# OpenSSL + CA certs for Prisma/HTTPS. glibc base (not Alpine) so native
# prebuilds for bcrypt/sharp/puppeteer work without a musl rebuild.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

RUN npx prisma generate
RUN npx prisma generate --schema=prisma/schema.user.prisma

COPY backend/ .

RUN npm run build

ENV NODE_ENV=production

# PORT is injected by Railway at runtime
CMD ["npm", "start"]
