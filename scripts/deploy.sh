#!/usr/bin/env bash
#
# Server-side deploy script.
#
# The image is built and pushed to the registry by the GitHub Actions workflow.
# This script runs ON THE SERVER, over SSH, and only pulls that pre-built image
# and (re)starts the container.
#
# Invoked by .github/workflows/deploy.yml like:
#
#   echo "$GHCR_TOKEN" | ssh user@host \
#     "IMAGE='ghcr.io/owner/repo:<sha>' REGISTRY='ghcr.io' \
#      REGISTRY_USER='owner' bash /tmp/deploy.sh"
#
# The registry token is read from STDIN so it never shows up in the process
# list or shell history.

set -euo pipefail

# ---- Configuration (overridable via environment) ----------------------------
IMAGE="${IMAGE:?IMAGE is required (e.g. ghcr.io/owner/repo:tag)}"
REGISTRY="${REGISTRY:-ghcr.io}"
REGISTRY_USER="${REGISTRY_USER:-}"
CONTAINER_NAME="${CONTAINER_NAME:-graduation-project}"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
APP_DIR="${APP_DIR:-$HOME/graduation-project}"
ENV_SRC="${ENV_SRC:-/tmp/graduation-project.env}"   # uploaded by the workflow

# Registry token arrives on stdin (may be empty for a public image).
REGISTRY_TOKEN=""
if [ ! -t 0 ]; then
  read -r REGISTRY_TOKEN || true
fi

mkdir -p "$APP_DIR" "$APP_DIR/uploads"

# Move the freshly uploaded env file into place with tight permissions.
if [ -f "$ENV_SRC" ]; then
  install -m 600 "$ENV_SRC" "$APP_DIR/.env"
  rm -f "$ENV_SRC"
fi
ENV_FILE="$APP_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: no env file at $ENV_FILE (the workflow should have uploaded it)." >&2
  exit 1
fi

echo "==> Target image: $IMAGE"

# ---- Authenticate to the registry (only if a token was supplied) ------------
if [ -n "$REGISTRY_TOKEN" ] && [ -n "$REGISTRY_USER" ]; then
  echo "==> Logging in to $REGISTRY as $REGISTRY_USER"
  echo "$REGISTRY_TOKEN" | docker login "$REGISTRY" -u "$REGISTRY_USER" --password-stdin
fi

echo "==> Pulling $IMAGE"
docker pull "$IMAGE"

echo "==> Replacing container '$CONTAINER_NAME'"
docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -v "$APP_DIR/uploads:/app/uploads" \
  "$IMAGE"

# ---- Housekeeping -----------------------------------------------------------
echo "==> Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

if [ -n "$REGISTRY_TOKEN" ] && [ -n "$REGISTRY_USER" ]; then
  docker logout "$REGISTRY" >/dev/null 2>&1 || true
fi

echo "==> Deployed. Currently running:"
docker ps --filter "name=$CONTAINER_NAME" \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
