#!/usr/bin/env sh
set -e

# Apply any pending Prisma migrations against the live database before the app
# starts serving. DATABASE_URL is provided at runtime (docker run --env-file).
echo "==> Applying database migrations (prisma migrate deploy)"
npx prisma migrate deploy

echo "==> Starting application"
# Root-level .ts files (prisma.config.ts, ApiResponse.ts) push the tsc output
# root up a level, so the compiled entry lives at dist/src/main.js.
exec node dist/src/main.js
