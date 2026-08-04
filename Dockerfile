FROM node:22-alpine

RUN apk add --no-cache openssl ca-certificates libc6-compat

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci --ignore-scripts || npm install

RUN npx prisma generate
RUN npx prisma generate --schema=prisma/schema.user.prisma

COPY backend/ .

RUN npx tsc -p tsconfig.json

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
