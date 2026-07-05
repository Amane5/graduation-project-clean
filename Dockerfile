# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
WORKDIR /app

# Prisma often needs OpenSSL in slim images
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# Important: generate Prisma Client inside Docker.
# `prisma generate` doesn't connect to the DB, but Prisma 7 eagerly resolves
# env("DATABASE_URL") from prisma.config.ts when loading config, so we pass a
# throwaway value here. The real DATABASE_URL is injected at runtime.
RUN DATABASE_URL="postgresql://user:password@localhost:5432/db?schema=public" npx prisma generate

RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# prisma.config.ts holds the datasource URL + migrations path used by
# `prisma migrate deploy` at container startup (see docker-entrypoint.sh).
COPY --from=builder /app/prisma.config.ts ./

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# Runs `prisma migrate deploy` against the live DB, then starts the app.
ENTRYPOINT ["./docker-entrypoint.sh"]