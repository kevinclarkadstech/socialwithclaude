#!/usr/bin/env bash
# Starts the built API (.output) with placeholder config and checks that responses keep their HTTP
# status: a Nitro release once turned every error into a 200. Needs no database or Redis.
set -euo pipefail
cd "$(dirname "$0")/.."

export PORT="${SMOKE_PORT:-3999}"
export DATABASE_URL="postgresql://smoke@127.0.0.1:1/smoke"
export BETTER_AUTH_SECRET="smoke-test-secret-smoke-test-secret"
export BETTER_AUTH_URL="http://localhost:$PORT"
export WEB_APP_URL="http://localhost:5173"
export STORAGE_ENDPOINT="http://127.0.0.1:1" STORAGE_REGION="smoke" STORAGE_ACCESS_KEY_ID="smoke" STORAGE_SECRET_ACCESS_KEY="smoke"
export STORAGE_UPLOADS_BUCKET="smoke" STORAGE_MEDIA_BUCKET="smoke" STORAGE_MEDIA_PUBLIC_URL="http://127.0.0.1:1"
export REDIS_URL="redis://127.0.0.1:1"

log=$(mktemp)
node .output/server/index.mjs > "$log" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null || true; rm -f "$log"' EXIT
for _ in $(seq 1 50); do
    curl -s -o /dev/null "http://localhost:$PORT/api/health" && break
    sleep 0.2
done

failed=0
expect() {
    local status
    status=$(curl -s -o /dev/null -w '%{http_code}' "${@:3}" "http://localhost:$PORT$2")
    if [ "$status" = "$1" ]; then
        echo "ok   $1 $2"
    else
        echo "FAIL $2: expected $1, got $status"
        failed=1
    fi
}
expect 200 /api/health
expect 404 /no-such-route
expect 400 /api/trpc/posts.createPost -X POST -H 'content-type: application/json' -d '{}'
expect 503 /api/ready

if [ "$failed" = 1 ]; then
    echo "--- server log"; cat "$log"
    exit 1
fi
