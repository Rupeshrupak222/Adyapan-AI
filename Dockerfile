FROM node:22-bookworm-slim

# OpenSSL + CA certs for Prisma/HTTPS. glibc base (not Alpine) so native
# prebuilds for bcrypt/sharp/puppeteer work without a musl rebuild.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    # Create a non-root user so the container does not run as root.
    # This limits blast radius if a vulnerability allows container escape.
    && groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home appuser

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

RUN npx prisma generate
RUN npx prisma generate --schema=prisma/schema.user.prisma

COPY backend/ .

RUN npm run build

# Give the non-root user ownership of the app directory (after all root-owned
# build steps: npm ci, prisma generate, build).
RUN chown -R appuser:nodejs /app

ENV NODE_ENV=production

# Switch to non-root user before starting
USER appuser

# PORT is injected by Railway at runtime
CMD ["npm", "start"]
