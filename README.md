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
