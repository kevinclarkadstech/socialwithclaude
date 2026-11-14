# socialwithclaude

A small social app with a marketplace: posts, listings, comments, chats and profiles.

| Path | What it is |
| --- | --- |
| `apps/api` | The API: Nitro, Hono, tRPC, Drizzle (Postgres), better-auth |
| `apps/app` | The app: Ionic React with Capacitor, for the web, iOS and Android |
| `packages/shared` | Code both use: Zod schemas, queries and mutations, authorization |
| `infra` | Local setup for services in `docker-compose.yml` |

## Local development

```sh
bun install
docker compose up -d          # Postgres, Redis, Meilisearch, Garage (object storage), Jaeger, Dozzle
./infra/garage/init.sh        # buckets, keys and CORS for local storage; safe to re-run
cp apps/api/.env.example apps/api/.env.local
bun run --cwd apps/api db:migrate
bun run dev                   # API on :3000, app on :5173
```

`apps/api/.env.example` lists every API variable. Its storage values point at the local Garage and aren't secrets.

## Deployment

### Object storage (Cloudflare R2)

The API talks to storage through the S3 API, so production uses R2 with no code changes, only configuration.

1. **Create two buckets.**
   - Uploads, e.g. `myapp-uploads-prod`: **private**. The app uploads files here with presigned URLs, and the API checks them before publishing.
   - Media, e.g. `myapp-media-prod`: **public**, served from a custom domain such as `media.example.com`. The API publishes checked photos here, with a one-year cache.
2. **Set up the uploads bucket.**
   - A CORS rule that allows `PUT` from each origin the app runs on (the web app's address, plus `capacitor://localhost` and `https://localhost` for iOS and Android):
     ```json
     [
       {
         "AllowedOrigins": ["https://app.example.com", "capacitor://localhost", "https://localhost"],
         "AllowedMethods": ["PUT"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```
   - A lifecycle rule that deletes objects after **1 day**. Uploads are deleted once they're confirmed or refused; this rule clears the ones that never get confirmed.
3. **Configure the API.** Fill in the `STORAGE_*` variables in its environment. `apps/api/.env.example` shows each one with an R2 example. Create an R2 API token with read and write access to both buckets for the key ID and secret.
4. **Configure the app.** Build it with `VITE_MEDIA_URL` set to the media bucket's public address, matching `STORAGE_MEDIA_PUBLIC_URL`.

### Cache (Redis)

The API's cache is Redis. For now it only holds rate-limit counters, so the limits hold across instances. Any Redis 7 works, e.g. Upstash. (Rate limiting goes through a `RateLimiter` interface, so on Cloudflare Workers it could use Workers rate-limit bindings instead; see `apps/api/src/rate-limiting/types/index.ts`.)

- Set `REDIS_URL`, e.g. `rediss://default:<password>@<host>:6379`.
- Set `CLIENT_IP_HEADER` to the header your proxy or CDN puts the caller's IP address in, e.g. `cf-connecting-ip` behind Cloudflare. The default is `x-forwarded-for`. Rate limits per IP trust this header, so the API must only be reachable through that proxy.
- If Redis goes down, the API keeps serving with rate limiting off and logs it. `/api/ready` reports `cache: false`.

### Error reporting (Sentry)

Unexpected errors (what the client sees as "Something went wrong") are reported to Sentry, along with uncaught exceptions and unhandled rejections. Expected failures (validation, not found, forbidden, rate limited) aren't reported. Traces stay on OpenTelemetry: Sentry sends errors only. (It goes through an `ErrorReporter` interface in `apps/api/src/observability/errors`, so the tracker can be swapped.)

- Set `SENTRY_DSN` from the Sentry project's settings. Optionally set `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`) and `SENTRY_RELEASE`, e.g. the commit SHA.
- A report carries the error, its stack, the request id, the procedure, the method and path, and the signed-in user's id. It doesn't carry cookies, headers (other than the user agent), bodies, query parameters, local variables or database query values. The bound values in query error messages are replaced with `[redacted]`.

### Health checks

- `GET /api/health`: liveness. The process is up.
- `GET /api/ready`: readiness. It returns 503 when the database can't be reached, and also reports whether the cache can.
