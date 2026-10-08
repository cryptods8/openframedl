#!/usr/bin/env bash
set -euo pipefail

# Usage: ./trigger-cron.sh <app_target: main|pro> <path_with_query>
# Example: ./trigger-cron.sh main "/api/notifications/process"

TARGET="${1:-main}"
ENDPOINT="${2:-}"

if [ -z "$ENDPOINT" ]; then
  echo "Error: Endpoint path is required."
  echo "Usage: $0 <main|pro> <path>"
  exit 1
fi

DEPLOY_DIR="/opt/framedl"

# Read CRON_SECRET and port from the appropriate env file
if [ "$TARGET" = "pro" ]; then
  ENV_FILE="$DEPLOY_DIR/.env.pro"
  CONTAINER="framedl-pro"
  PORT=3001
else
  ENV_FILE="$DEPLOY_DIR/.env.framedl"
  CONTAINER="framedl-app"
  PORT=3000
fi

if [ -f "$ENV_FILE" ]; then
  CRON_SECRET=$(grep -E '^CRON_SECRET=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
else
  echo "Warning: $ENV_FILE not found, attempting request without token"
  CRON_SECRET=""
fi

# Execute curl directly inside docker network or localhost
# In docker network: http://localhost:PORT or http://framedl-app:3000
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:${PORT}${ENDPOINT}")

HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)
BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [$TARGET] $ENDPOINT -> HTTP $HTTP_CODE | $BODY"
