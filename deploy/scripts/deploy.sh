#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="/opt/framedl"
cd "$DEPLOY_DIR"

echo "==> Pulling latest Docker image..."
docker compose pull

echo "==> Running database migrations (framedl)..."
if [ -f ".env.framedl" ]; then
  docker compose run --rm --no-deps -e PG_CONNECTION_STRING="$(grep -E '^PG_CONNECTION_STRING=' .env.framedl | cut -d '=' -f2-)" framedl-app pnpm db:migrate || true
fi

echo "==> Running database migrations (pro)..."
if [ -f ".env.pro" ]; then
  docker compose run --rm --no-deps -e PG_CONNECTION_STRING="$(grep -E '^PG_CONNECTION_STRING=' .env.pro | cut -d '=' -f2-)" framedl-pro pnpm db:migrate || true
fi

echo "==> Applying rolling restart..."
docker compose up -d --remove-orphans

echo "==> Waiting for containers to become healthy..."
sleep 5

MAX_RETRIES=10
for i in $(seq 1 $MAX_RETRIES); do
  MAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || true)
  PRO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health || true)

  if [ "$MAIN_STATUS" = "200" ] && [ "$PRO_STATUS" = "200" ]; then
    echo "==> Both framedl-app and framedl-pro are healthy (HTTP 200)!"
    break
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "==> Healthcheck failed! framedl: $MAIN_STATUS, pro: $PRO_STATUS"
    docker compose logs --tail=50
    exit 1
  fi

  echo "Retry $i/$MAX_RETRIES: waiting for healthcheck..."
  sleep 3
done

echo "==> Pruning dangling Docker images..."
docker image prune -f

DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
COMMIT_SHA=$(docker inspect framedl-framedl-app-1 --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null || echo "unknown")
IMAGE_CREATED=$(docker inspect framedl-framedl-app-1 --format '{{index .Config.Labels "org.opencontainers.image.created"}}' 2>/dev/null || echo "unknown")
IMAGE_DIGEST=$(docker inspect framedl-framedl-app-1 --format '{{.Image}}' 2>/dev/null || echo "unknown")

echo "[${DEPLOY_TIME}] deployed commit=${COMMIT_SHA} built=${IMAGE_CREATED} image=${IMAGE_DIGEST}" | tee -a /var/log/framedl-deploys.log

echo "==> Deployment finished successfully!"
