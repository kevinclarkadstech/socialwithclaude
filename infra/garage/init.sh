#!/usr/bin/env bash
# One-time setup of the local Garage storage (safe to run again).
# Run after `docker compose up -d garage`. Creates:
#   - a node layout (single node, 1 GB)
#   - the dev access key the API uses (STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY)
#   - myapp-uploads-dev: private; presigned PUTs from the app land here (CORS for the app's origins)
#   - myapp-media-dev: public reads at http://myapp-media-dev.web.garage.localhost:3902/<key>
# These are local-only values, not secrets. Production uses Cloudflare R2 (see apps/api/.env.example).
set -euo pipefail

# Git Bash on Windows rewrites arguments that look like paths (/garage) into Windows paths before
# they reach docker, which breaks every command run in the container. Turn that off; elsewhere it
# does nothing.
export MSYS_NO_PATHCONV=1

# Say which step failed, rather than stopping silently (most commands' output is hidden).
trap 'echo "init.sh failed at line $LINENO: $BASH_COMMAND" >&2' ERR

ACCESS_KEY_ID="${STORAGE_ACCESS_KEY_ID:-GK0123456789abcdef01234567}"
SECRET_ACCESS_KEY="${STORAGE_SECRET_ACCESS_KEY:-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef}"
UPLOADS_BUCKET="${STORAGE_UPLOADS_BUCKET:-myapp-uploads-dev}"
MEDIA_BUCKET="${STORAGE_MEDIA_BUCKET:-myapp-media-dev}"
S3_URL="${GARAGE_S3_URL:-http://localhost:3900}"
# Origins allowed to upload (the web app and the Capacitor apps).
ORIGINS=(${UPLOAD_ORIGINS:-http://localhost:5173 capacitor://localhost https://localhost})

garage() { docker compose exec -T -e RUST_LOG=warn garage /garage "$@"; }

echo "Layout…"
# Check Garage answers first: a failure inside the `if` below would otherwise just skip the step.
layout=$(garage layout show)
if grep -q "No nodes currently have a role" <<<"$layout"; then
  node_id=$(garage status | awk '/HEALTHY NODES/ { getline; getline; print $1 }')
  garage layout assign -z dc1 -c 1G "$node_id" >/dev/null
  garage layout apply --version 1 >/dev/null
fi

echo "Access key…"
garage key info "$ACCESS_KEY_ID" >/dev/null 2>&1 \
  || garage key import --yes -n myapp-dev "$ACCESS_KEY_ID" "$SECRET_ACCESS_KEY" >/dev/null

echo "Buckets…"
for bucket in "$UPLOADS_BUCKET" "$MEDIA_BUCKET"; do
  garage bucket info "$bucket" >/dev/null 2>&1 || garage bucket create "$bucket" >/dev/null
  garage bucket allow --read --write --owner "$bucket" --key "$ACCESS_KEY_ID" >/dev/null
done
garage bucket website --allow "$MEDIA_BUCKET" >/dev/null

echo "Upload CORS and expiry…"
# One rule per origin: with several origins in one rule, Garage answers with all
# of them in one header, which browsers reject.
cors="<CORSConfiguration>"
for origin in "${ORIGINS[@]}"; do
  cors+="<CORSRule><AllowedOrigin>${origin}</AllowedOrigin><AllowedMethod>PUT</AllowedMethod><AllowedHeader>*</AllowedHeader><MaxAgeSeconds>3600</MaxAgeSeconds></CORSRule>"
done
cors+="</CORSConfiguration>"
curl -sf --noproxy localhost -o /dev/null \
  --aws-sigv4 "aws:amz:garage:s3" --user "${ACCESS_KEY_ID}:${SECRET_ACCESS_KEY}" \
  -X PUT -H "Content-Type: application/xml" \
  -H "Content-MD5: $(printf '%s' "$cors" | openssl md5 -binary | base64)" \
  --data-binary "$cors" "${S3_URL}/${UPLOADS_BUCKET}?cors"

# Uploads only live until they're confirmed; anything left behind (an
# abandoned upload) expires after a day. Configure the same rule on R2.
lifecycle="<LifecycleConfiguration><Rule><ID>expire-abandoned-uploads</ID><Status>Enabled</Status><Filter><Prefix></Prefix></Filter><Expiration><Days>1</Days></Expiration></Rule></LifecycleConfiguration>"
curl -sf --noproxy localhost -o /dev/null \
  --aws-sigv4 "aws:amz:garage:s3" --user "${ACCESS_KEY_ID}:${SECRET_ACCESS_KEY}" \
  -X PUT -H "Content-Type: application/xml" \
  -H "Content-MD5: $(printf '%s' "$lifecycle" | openssl md5 -binary | base64)" \
  --data-binary "$lifecycle" "${S3_URL}/${UPLOADS_BUCKET}?lifecycle"

echo "Done. Media is served at http://${MEDIA_BUCKET}.web.garage.localhost:3902/<key>"
