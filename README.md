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

### Tests

- `bun run --cwd apps/api test`, `bun run --cwd packages/shared test`, `bun run --cwd apps/app test`: unit tests, no services needed.
- `bun run --cwd apps/api test:integration`: the API's routers against a real Postgres (who can see and do what). It **empties its database first**, so `DATABASE_URL` must name one ending in `_test`, e.g. `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_test` (create it once with `createdb -h localhost -U postgres app_test`). CI runs it against a throwaway Postgres container.

`apps/api/.env.example` lists every API variable. Its storage values point at the local Garage and aren't secrets.

## Launch checklist

What the app stores and the law expect from a social app with photos, and where the app stands. Apple: [App Review Guideline 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content) (user-generated content). Google Play: the [Child Safety Standards policy](https://support.google.com/googleplay/android-developer/answer/14747720) for social apps.

**Done**
- [x] Report a post, a comment, a person or a chat message (Apple 1.2; Google Play's user-generated content policy). After reporting a person or message, the app offers to block them.
- [x] Block someone: either way, they disappear from feeds, search and comments, and can't message you (Apple 1.2).
- [x] Send feedback from the app (Google's in-app feedback requirement).
- [x] Photos stripped of location and other metadata when they're published.
- [x] **Hide banned people's content:** their profile, posts, listings and comments disappear everywhere (feeds, Marketplace, search, mentions, comments, saves) while the ban lasts, and come back when it ends or is lifted. Nothing is deleted. Chats with them stay, with their history, but show them as "Account unavailable" and can't be replied to.
- [x] **Warnings and replies to reporters:** admins can warn someone from a report (they get a notification), each report card shows the person's last 90 days (warnings, removals, bans), and everyone who reported something is told the outcome. Notifications are under the bell in the header.
- [x] **Act on reports** (Settings → Admin, admins only): one queue item per reported thing with every report about it; dismiss, remove it (a post's photo files too), or ban its person. Every action goes in the moderation log. Apple treats removing reported content quickly as the minimum for filtering objectionable material, and expects nonconsensual intimate imagery to be removed proactively. See [Admin and moderation](#admin-and-moderation).
- [x] **Account deletion** in the app (Apple 5.1.1(v): any app with sign-up must let people delete their account from inside it). Deletes their data, except reports and the moderation log. See [Account deletion](#account-deletion).
- [x] **Email delivery** through Resend or Mailgun (the API won't start in production without one).

**Before launch**
- [ ] **CSAM scanning** on the media domain: step 6 under Object storage (Google requires handling CSAM; US law requires reporting it).
- [ ] **Contact details** in the app and on the store listings (Apple 1.2).
- [ ] **Child safety standards page:** a public web page with your standards against child sexual abuse and exploitation, naming the app, plus a child safety point of contact (Google).
- [ ] **Self-certify** the Child Safety Standards in Play Console before publishing (Google).
- [ ] **Privacy policy and terms,** linked from sign-up and the store listings. Say that photo links work for anyone who has one, and that public posts' photos may appear in search engines.
- [ ] **Set up email** for sign-in codes: Resend or Mailgun, with the sending domain verified. See [Email](#email).

**Later**
- [ ] **Public post and profile pages** (server-rendered, public accounts only, with `og:image`, structured data and a sitemap), so public photos can show in Google Images.
- [ ] If leaked photo links become a problem: signed, expiring links checked by Cloudflare (WAF HMAC validation on the media domain, Pro plan), so links stop working after 7 days.

## Admin and moderation

Admins see **Admin** in Settings: the report queue and the feedback people sent. Nothing in the app can make someone an admin; run this against the database instead (they need to have signed in once):

```sh
bun run --cwd apps/api admin:grant someone@example.com
bun run --cwd apps/api admin:revoke someone@example.com
```

- **Reports:** one item per reported post, comment, profile or chat message, longest-waiting first, with every report about it and a snapshot of it as last reported. **Dismiss** (nothing wrong), **Remove** (deleted for everyone, a post's photo files too), or **Ban** its person.
- **Bans** (better-auth's admin plugin): for 1, 7 or 30 days, or for good. The person is signed out everywhere at once and can't sign in until it ends, and their profile, posts and comments are hidden from everyone until then (nothing is deleted). Admins can't be banned.
- **Moderation log:** every dismissal, removal, ban and unban is kept in `moderation_actions` (who, what, about whom, why, when), for appeals and store reviews.
- **Warnings:** Warn on a report card picks a reason (the ones it was reported for first) and an optional note, then offers to remove the thing or mark its reports reviewed. They get a notification with a default message; it counts in the 90-day history shown on their report cards. There are no automatic bans.
- **Reporters are told the outcome** (removed, reviewed, or not against the guidelines) in a notification, with a default message.
- **Feedback:** newest first, filtered by New, Read and Done.

### Account deletion

People delete their account from the app, confirming with a code sent by email (Apple and Google require that deletion can be started in the app).

- **30 days to change their mind.** Their account is hidden at once, like a banned one, and every device is signed out. Signing back in within 30 days lets them restore it; until then the API treats them as signed out everywhere else.
- **Then everything goes.** `bun run --cwd apps/api accounts:purge` deletes accounts past their 30 days: the profile, posts and listings (with every comment, save and vote on them), comments, votes, saves, follows, blocks, chats (both sides), notifications, and the photo files. It takes them out of other people's counts too (followers, comments, saves, votes) and revokes their Sign in with Apple tokens. Run it daily (a cron job, or a Cron Trigger on Workers).
- **Moderation records are kept.** Reports, with their snapshots, and the moderation log outlive both the reported person's and the reporter's accounts. The report queue shows a deleted person as a deleted account; their content is already gone, so its reports can only be marked reviewed or dismissed.
- **Banned people** can't sign in, so they ask by email. Delete their account straight away with:

  ```sh
  bun run --cwd apps/api accounts:delete someone@example.com --confirm
  ```

  A banned person's email is kept as a keyed hash (`banned_emails`), so it can't be used to sign up again.

## Deployment

### Object storage (Cloudflare R2)

The API talks to storage through the S3 API, so production uses R2 with no code changes, only configuration.

1. **Create two buckets.**
   - Uploads, e.g. `myapp-uploads-prod`: **private**. The app uploads files here with presigned URLs, and the API checks them before publishing.
   - Media, e.g. `myapp-media-prod`: **public**, served from a custom domain such as `media.example.com`. The API publishes checked photos here, with a one-year cache.
     - **Only by exact key:** leave the bucket's `r2.dev` address disabled, and don't allow listing. Photo keys hold a random 80-bit photo id, so a photo can only be opened by someone given its URL. A followers-only post's URL only ever reaches its followers.
     - **Crawlable:** don't block search engines (no `robots.txt` disallow, no `noindex` header). Public photos can then appear in image search once there are public pages that show them (see the launch checklist). Private posts' photos aren't on any page a crawler can reach.
     - A link keeps working for anyone who has it until the photo is deleted (deleting a post or a photo deletes its files). Say so in the privacy policy.
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
5. **Schedule the orphan sweep.** If saving a post fails after its photos were published and the app never retries, or a delete fails after a post is edited or deleted, published files are left with no post. `bun run --cwd apps/api media:sweep --delete` removes post photo files older than a day that no live post uses. Without `--delete` it only reports. Run it daily (a cron job, or a Cron Trigger on Workers).
6. **Turn on CSAM scanning (before launch).** Every photo people upload is served from the media domain, so it must be checked against known child sexual abuse material. Cloudflare's free [CSAM Scanning Tool](https://developers.cloudflare.com/cache/reference/csam-scanning/) compares what's served through Cloudflare's cache on your zone against known CSAM lists:
   - Serve the media bucket from the **custom domain** (step 1), on a zone in your account. The shared `r2.dev` address isn't on your zone, so it isn't covered.
   - In the Cloudflare dashboard, open that zone, go to **Caching → Configuration**, select **Configure** next to CSAM Scanning Tool, and give an email address that's read promptly. Cloudflare notifies it when it finds a match.
   - Check that photos really come through the cache: a media URL's response should have a `cf-cache-status` header.
   - On a match, Cloudflare blocks the URL and emails you. The match still has to be dealt with: in the US, providers must report it to NCMEC's CyberTipline, and other countries have their own rules. Keep what's needed for the report; Cloudflare's email says what that is.

### Email

Sign-in codes and account deletion codes go by email. Locally they're written to the API's log (`EMAIL_PROVIDER=console`); in production the API won't start until a real provider is set. Both Resend and Mailgun are supported, through their REST APIs (the `EmailSender` interface in `apps/api/src/notifications/email/delivery`, so another provider is one file).

1. **Verify a sending domain** with the provider, ideally a subdomain such as `mail.example.com`, so its reputation is separate from your main domain's. Add the DNS records it gives you: SPF and DKIM for sending, and a return-path (bounce) record. Mailgun calls the domain `MAILGUN_DOMAIN`; Resend just needs it verified.
2. **Add a DMARC record** for the domain (`_dmarc`, e.g. `v=DMARC1; p=none; rua=mailto:dmarc@example.com` to start, then `p=quarantine` once reports look clean). Gmail and Yahoo require one from bulk senders, and it helps codes reach the inbox.
3. **Set the API's environment:**
   - Resend: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`, e.g. `Placeholder <no-reply@mail.example.com>`.
   - Mailgun: `EMAIL_PROVIDER=mailgun`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION` (`us` or `eu`, where the account was created) and `EMAIL_FROM`.

   A provider chosen without its settings stops the API at startup, naming what's missing.
4. **Pick a plan that covers sign-ins.** Every sign-in sends an email, and free tiers stop at 100 a day.

A send that fails is logged and reported to Sentry, with the provider's status and reason but never the code.

**Limits on sending codes** (`apps/api/src/rate-limiting/constants`), so nobody can flood an inbox or run up the bill:

- Sign-in codes: 5 per 15 minutes and 10 a day per email address; 10 per 15 minutes and 30 a day per IP address.
- Account deletion codes: 3 per 15 minutes and 10 a day per person.
- **An hourly budget for all email together,** `EMAIL_HOURLY_LIMIT` (default 300), which a bot spread across many addresses and IPs can't get past. It counts only codes the other limits let through. Once it's used up, codes are refused until the hour is up, and Sentry is told (once an hour). Raise it as the app grows.
- If Redis can't be reached, no codes are sent, rather than sent without limits. People who already have a code can still use it.

### Cache (Redis)

The API's cache is Redis. For now it only holds rate-limit counters, so the limits hold across instances. Any Redis 7 works, e.g. Upstash. (Rate limiting goes through a `RateLimiter` interface, so on Cloudflare Workers it could use Workers rate-limit bindings instead; see `apps/api/src/rate-limiting/types/index.ts`.)

- Set `REDIS_URL`, e.g. `rediss://default:<password>@<host>:6379`.
- Set `CLIENT_IP_HEADER` to the header your proxy or CDN puts the caller's IP address in, e.g. `cf-connecting-ip` behind Cloudflare. The default is `x-forwarded-for`. Rate limits per IP trust this header, so the API must only be reachable through that proxy.
- If Redis goes down, the API keeps serving with rate limiting off and logs it. `/api/ready` reports `cache: false`. The exception is sending email: without the counters, no codes are sent (see [Email](#email)).

### Error reporting (Sentry)

Unexpected errors (what the client sees as "Something went wrong") are reported to Sentry, along with uncaught exceptions and unhandled rejections. Expected failures (validation, not found, forbidden, rate limited) aren't reported. Traces stay on OpenTelemetry: Sentry sends errors only. (It goes through an `ErrorReporter` interface in `apps/api/src/observability/errors`, so the tracker can be swapped.)

- Set `SENTRY_DSN` from the Sentry project's settings. Optionally set `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`) and `SENTRY_RELEASE`, e.g. the commit SHA.
- A report carries the error, its stack, the request id, the procedure, the method and path, and the signed-in user's id. It doesn't carry cookies, headers (other than the user agent), bodies, query parameters, local variables or database query values. The bound values in query error messages are replaced with `[redacted]`.

### Health checks

- `GET /api/health`: liveness. The process is up.
- `GET /api/ready`: readiness. It returns 503 when the database can't be reached, and also reports whether the cache can.
