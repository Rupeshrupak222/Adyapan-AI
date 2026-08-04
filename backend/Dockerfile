FROM node:22-alpine

# Install OpenSSL & libc requirements for Prisma
RUN apk add --no-cache openssl ca-certificates libc6-compat

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies cleanly
RUN npm ci --ignore-scripts || npm install

# Generate Prisma Clients
RUN npx prisma generate
RUN npx prisma generate --schema=prisma/schema.user.prisma

# Copy application source code
COPY . .

# Build TypeScript code
RUN npx tsc -p tsconfig.json

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
