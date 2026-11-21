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

### Where things are

- `packages/shared/src/domains`: each domain's types, mutations, queries and authorization (posts, chats, users, notifications, auth, admin), used by both the API and the app. Most of the app's logic lives here.
- `apps/api/src`:
  - `domains/`: what only the server can do: `accounts` (deleting and purging accounts, banned emails), `auth` (Better Auth), `media` (checking and publishing photos, the orphan sweep), `notifications` (email and push delivery).
  - `infra/`: what the API runs on and talks to: `config`, `cache`, `storage`, `rate-limiting`, `observability`, `error-handling`, `feature-flags`, and `platform` (what differs between a server and Cloudflare Workers).
  - `data-access/`: the database schema and every query (resolvers).
  - Entry points: `index.ts` (the Hono app), `transport/` (tRPC routers, Nitro plugins), `jobs/` (work outside requests), `commands/` (`bun run …` scripts).
- `apps/app/src`: `domains/` (each domain's components, hooks and operations), `pages/`, `navigation/`, `lib/` and `common/`.

**Why there's no posts or chats folder in the API.** A domain is spread over the layers, and only server-only work gets a folder in `apps/api/src/domains`. Posts (listings included) and chats, for example:

| | Posts (and listings) | Chats |
|---|---|---|
| Rules: types, authorization, mutations, queries, validation | `packages/shared/src/domains/posts` (`createPostMutation`, `savePostMutation`…) | `packages/shared/src/domains/chats` |
| Storage: the database queries | `apps/api/src/data-access/resolvers/posts` | `…/resolvers/chats` |
| Procedures the app calls | `apps/api/src/transport/trpc/routers/posts.ts`, `post-comments.ts`, `post-listings.ts` | `…/routers/chats.ts` |
| Screens | `apps/app/src/domains/posts` | `apps/app/src/domains/chats` |

A mutation such as `createPostMutation` holds the domain's rules (who may, what's valid, what happens) but doesn't touch the database: the router hands it the resolvers it needs (`createPost`, `getPostById`…). So the rules live in one place, and the API plugs the database in. `apps/api/src/domains` is only for what a shared mutation can't do: checking and publishing photos (`media`), sending email and pushes (`notifications`), purging accounts and banned emails (`accounts`), and Better Auth (`auth`). Posts and chats have no such work of their own (their photos go through `media`, their pushes through `notifications`); one that needs it later, such as a job expiring old listings, gets a folder then.

**Listings** are posts of the listing kind, not a domain of their own: hence the `post-listings` router and resolvers like `getListingPostViews` within posts. If they grow their own rules (marking as sold, price changes, expiry), they can become a `listings` domain in `packages/shared`.

### Tests

- `bun run --cwd apps/api test`, `bun run --cwd packages/shared test`, `bun run --cwd apps/app test`: unit tests, no services needed.
- `bun run --cwd apps/api test:integration`: the API's routers against a real Postgres (who can see and do what). It **empties its database first**, so `DATABASE_URL` must name one ending in `_test`, e.g. `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_test` (create it once with `createdb -h localhost -U postgres app_test`). CI runs it against a throwaway Postgres container.

`apps/api/.env.example` lists every API variable. Its storage values point at the local Garage and aren't secrets.

### iOS and Android

The native apps are Capacitor 8 projects around the web build: `apps/app/ios` (Xcode, Swift Package Manager, no CocoaPods) and `apps/app/android` (Gradle). They're committed; the web build copied into them isn't.

1. Build the web app with the API's real addresses, since a native app has no localhost to fall back on: `VITE_API_URL=https://… VITE_PUBLIC_URL=https://… VITE_MEDIA_URL=https://… bun run --cwd apps/app cap:sync` builds it and copies it into both projects (it also refreshes the plugins' paths in `node_modules`, so run it after installing packages too). Locally, a phone or emulator reaches your computer's API by its address on the network, not `localhost`.
2. Open `apps/app/ios/App/App.xcodeproj` in Xcode (on a Mac) or `apps/app/android` in Android Studio, and run it. Without a Mac, iOS builds come from GitHub Actions: see [Releasing the iOS app](#releasing-the-ios-app).

The app id, `com.example.placeholder` in `apps/app/capacitor.config.ts`, is a **placeholder**: see the launch checklist.

CI builds both on PRs, without signing, so a change that breaks a native build shows up there: Android (an unsigned debug APK, kept for 7 days as the run's artifact) on any change to the app, and iOS (a simulator build) only when the Xcode project, Capacitor's config or a dependency changes, every Monday, and on demand from the Actions tab, since macOS runners cost about 10x Linux minutes on a private repository.

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
- [x] **Terms and privacy policy agreed to at sign-up** (Apple 1.2 asks for terms with no tolerance for objectionable content), recorded with their version; drafts to finish before launch (below).
- [x] **A web page for deletion requests**, `/delete-account` (Google Play).
- [x] **Child safety standards page,** `/child-safety` (Google): what's not allowed, how to report (in the app, by email, to NCMEC), what's done about it, and a child safety point of contact. Linked from the terms and Settings.
- [x] **Contact us** in Settings, an email link (Apple 1.2).
- [x] **13 and over:** sign-up asks for a birth month and year without saying the cutoff (a "neutral age screen", as the FTC suggests under COPPA). Someone under 13 is told they can't use the app (with the contact address, for a mistake), their account is deleted with what they entered, and that app install or browser won't offer sign-up again. It's a deterrent, not a lock: another browser or device, or clearing the app's data, gets round it, and that's what to tell someone who emails about a mistake. The month and year are kept (`users.birth_year`, `birth_month`) and never shown. Set the App Store age rating and Play's content rating to match.
- [x] **Email delivery** through Resend or Mailgun (the API won't start in production without one).

**Before launch**
- [ ] **CSAM scanning** on the media domain: step 6 under Object storage (Google requires handling CSAM; US law requires reporting it).
- [ ] **Real contact addresses:** set `contactEmail` and `childSafetyEmail` in `apps/app/src/common/brand.ts` (they're `@example.com` placeholders), and put the contact address on the store listings too (Apple 1.2).
- [ ] **Finish the child safety standards:** fill in the [placeholders] in `apps/app/src/domains/legal/documents/child-safety.md` (the point of contact's name or role, response time, company), and give `<app web address>/child-safety` and the point of contact in Play Console (Google).
- [ ] **Self-certify** the Child Safety Standards in Play Console before publishing (Google).
- [ ] **Finish the Terms of Service and Privacy Policy:** fill in the [placeholders] in `apps/app/src/domains/legal/documents/` (company, contact, jurisdiction, providers, retention), have a lawyer review them, and remove the "Draft" notes. Link `/terms` and `/privacy` from the store listings. See [Terms and privacy](#terms-and-privacy).
- [ ] **Account deletion URL in Play Console:** `<app web address>/delete-account` (Google requires one that works without the app).
- [ ] **Set up email** for sign-in codes: Resend or Mailgun, with the sending domain verified. See [Email](#email).
- [ ] **Set up push notifications** (Firebase): a Firebase project with the Android and iOS apps (using the real app id), its two config files in the native projects, your APNs key uploaded to it, and the API's `PUSH_PROVIDER=fcm` with `FCM_SERVICE_ACCOUNT_JSON`. Then try it on a real iPhone (the simulator can't receive pushes from Apple) and an Android phone. See [Push notifications](#push-notifications).
- [ ] **Links that open the app** (Universal Links on iOS, App Links on Android): put the real web address in place of `app.example.com` and the real app id, Apple team id and Play signing key's SHA-256 in the two files under `apps/app/public/.well-known/`, and serve them from that address. See [Links that open the app](#links-that-open-the-app).
- [ ] **The real app id** (reverse domain, e.g. `com.yourcompany.appname`), which can't change after the first store upload: in `apps/app/capacitor.config.ts`, the Xcode project's bundle identifier (`apps/app/ios/App`), `applicationId` in `apps/app/android/app/build.gradle`, `app_identifier` in `apps/app/ios/App/fastlane/Appfile`, the two `.well-known` files (see [Links that open the app](#links-that-open-the-app)), and the API's `APPLE_APP_BUNDLE_IDENTIFIER`. Also the app's name, icons and splash screen.
- [ ] **Set up iOS releases:** an Apple Developer account, the app in App Store Connect, and the workflow's secrets and variables; then push a version tag to send a build to TestFlight. See [Releasing the iOS app](#releasing-the-ios-app).
- [ ] **The review account** for App Review (and Play's app access): `REVIEW_ACCOUNT_EMAIL` and `REVIEW_ACCOUNT_CODE` on the API, the same in App Store Connect's sign-in information, and the account signed up with some content. See [the review account](#releasing-the-ios-app).
- [ ] **Android releases** (later): signed builds to Play's internal testing track. Needs a Google Play developer account; a new personal account also has to run a closed test (12 testers for 14 days) before it can publish.
- [ ] **Host the API and web app:** both on Cloudflare Workers, the API with Neon. See [Deploying the API to Cloudflare](#deploying-the-api-to-cloudflare) and [Deploying the web app to Cloudflare](#deploying-the-web-app-to-cloudflare).
- [ ] **The daily jobs:** on Workers they're Cron Triggers, set up by the deploy. On a long-running server, schedule these daily:
  - `bun run --cwd apps/api accounts:purge`: deletes accounts whose 30 days to restore are up. Without it, deleted accounts are hidden but never actually deleted. See [Account deletion](#account-deletion).
  - `bun run --cwd apps/api media:sweep --delete`: removes photo files that no post uses. See step 5 under [Object storage](#object-storage-cloudflare-r2).

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

### Terms and privacy

The Terms of Service, Privacy Policy and Child Safety Standards are Markdown files in `apps/app/src/domains/legal/documents/`, shown at `/terms`, `/privacy` and `/child-safety` (public, also linked from Settings; the first two from sign-up too). `{{appName}}`, `{{contactEmail}}` and `{{childSafetyEmail}}` are filled in from `apps/app/src/common/brand.ts`, the addresses as email links.

- **Agreeing:** finishing sign-up needs the "I agree" checkbox; the API refuses sign-up without it and records the version (`users.terms_accepted_version` and `terms_accepted_at`).
- **Changing them:** `currentTermsVersion` in `packages/shared/src/domains/auth/constants` is "major.minor", agreed to for both documents together. Keep the version printed at the top of each document in step (a test checks). For a small edit, raise the minor version. For a change people must agree to again, raise the major version: everyone signed in then sees "We've updated our terms" before they can carry on (or sign out, or delete their account).

### Account deletion

People delete their account from the app (Settings → Delete account), confirming with a code sent by email (Apple and Google require that deletion can be started in the app). `/delete-account` is the same page at a public address, for Google Play's deletion URL: signed out, it asks you to sign in first.

- **30 days to change their mind.** Their account is hidden at once, like a banned one, and every device is signed out. Signing back in within 30 days lets them restore it; until then the API treats them as signed out everywhere else.
- **Then everything goes.** `bun run --cwd apps/api accounts:purge` deletes accounts past their 30 days: the profile, posts and listings (with every comment, save and vote on them), comments, votes, saves, follows, blocks, chats (both sides), notifications, and the photo files. It takes them out of other people's counts too (followers, comments, saves, votes) and revokes their Sign in with Apple tokens. Run it daily (a cron job, or a Cron Trigger on Workers).
- **Moderation records are kept.** Reports, with their snapshots, and the moderation log outlive both the reported person's and the reporter's accounts. The report queue shows a deleted person as a deleted account; their content is already gone, so its reports can only be marked reviewed or dismissed.
- **Banned people** can't sign in, so they ask by email. Delete their account straight away with:

  ```sh
  bun run --cwd apps/api accounts:delete someone@example.com --confirm
  ```

  A banned person's email is kept as a keyed hash (`banned_emails`), so it can't be used to sign up again.

## Hosting plan (not built yet)

What the app is planned to launch on, and the work to get there. Nothing below is built yet; today the API runs as a long-running Node or Bun server.

**The stack:** Cloudflare (Workers for the API, the web app, R2 for photos, the Rate Limiting binding, Queues), Neon (Postgres), Resend (email), Firebase (push only) and Sentry (errors, on the API and in the app). No Redis, and no product analytics to start: SQL on Neon, App Store Connect and Play Console answer the early questions.

**Why:** it costs little while there are few users (Workers Paid is $5 a month with 10M requests included, then $0.30 per million), and it grows smoothly with no servers to scale by hand. Polling is what drives the request count, so it's kept slow (step 4). A long-running server (Fly.io, Railway) would run today's code unchanged for a fixed $6–12 a month, with scaling done by hand; one small machine is roughly enough for 10–20k daily users. Check current prices before deciding, Neon's especially.

### Keeping it portable

Domain code only calls interfaces; each host gets adapters. What's Cloudflare-only (the Wrangler config, queue consumers, the `scheduled` handler) lives in one folder, and nothing in the domains touches Cloudflare's `env` or its types: the adapters are built from it when each request comes in. Moving host means new adapters and a different Nitro preset.

| Concern | Interface | Cloudflare | Long-running server |
|---|---|---|---|
| Rate limits | `RateLimiter.consume({ rule, key, cost? })` (exists, routed by window) | Per-minute rules: the Rate Limiting binding. Longer or exact rules: Postgres | Postgres, in-memory or Redis |
| Database | drizzle from a connection string (exists) | Hyperdrive's connection string, a client per request | A pool |
| Delayed delivery (pushes) | The database is the queue (`deliver_at`, `FOR UPDATE SKIP LOCKED`); only the wake-up differs | A queue message with a delay (or a Durable Object alarm) for the next due time | The current loop |
| Daily jobs | Plain functions (exist, behind the commands) | The `scheduled` handler | Cron or the CLI |
| Real-time (later, if needed; see step 4) | `Realtime.publish({ userId, event })`, one subscribe hook in the app | A Durable Object per user, with WebSockets | In-process connections, plus Postgres `LISTEN/NOTIFY` across instances |
| Photos | S3 API through aws4fetch (exists) | R2's S3 API (not the R2 binding) | Any S3 |
| Errors | `ErrorReporter` (exists) | `@sentry/cloudflare` | `@sentry/node` |
| Email, push | `fetch`-based senders (exist) | Same | Same |
| Entry point | Hono app (exists) | Nitro's Cloudflare preset | Nitro's Node or Bun preset |

### Steps, in order

1. **Rate limits that fit any host.** *Done, except the binding itself.* Each rule goes to the right backend: rules with a 10 or 60 second window to a fast, approximate limiter, and the rest (the 15-minute and daily email-code rules, the hourly `emailBudget`) to a Postgres counters table, since they protect the email bill and must be one exact count everywhere. `consume` takes a `cost` (the binding's `delta`), so expensive calls can count for more. The Rate Limiting binding's limit and window live in the Wrangler config, so a check (test or startup) makes sure each rule mapped to a binding matches it; that adapter and its check come with step 2. Notes from the binding's docs: counts are approximate and kept per Cloudflare location; windows are 10 or 60 seconds only; a refused call doesn't count; key by user id where there is one (Cloudflare advises against IP keys, which signed-out auth requests still need).
2. **The API on Workers.**
   - *Done:* Nitro's Cloudflare preset and `apps/api/wrangler.jsonc`. See [Deploying the API to Cloudflare](#deploying-the-api-to-cloudflare).
   - *Done:* a database client per request on Workers (`withRequestDatabase`, chosen by the `#platform` import, which the Workers build resolves to `src/infra/platform/workerd.ts`), and no push loop there. Tried locally in `wrangler dev`: with one shared pool, every other request that used the database failed; per request, they all work, including signing in.
   - *Done:* Hyperdrive in front of Neon, with query caching off, and each request's client connecting through it. `pg` keeps working, transactions included; Neon's HTTP driver wouldn't (no interactive transactions).
   - *Done:* Smart Placement, so a request's queries don't each cross the world.
   - *Done:* Redis is optional. With `REDIS_URL`, per-minute limits are counted there; without it, in each instance's memory; on Workers, by the Rate Limiting binding. `/api/ready` never fails because of it.
   - *Done:* push delivery through a queue, with a message delayed until each push is due (keeping the ~10-second chat pushes). No schedule for it, so the database can go idle when nobody's using the app: a lost queue message's pushes go with the next round, or not at all once they're an hour old. The daily jobs on a Cron Trigger.
   - *Done:* a smoke test on workerd in CI (`smoke:workers`), since tests run on Bun.
   - *Done:* errors to Sentry through `@sentry/cloudflare` (`@sentry/node` can't start on Workers). Logs and traces are in Workers Observability.
3. **The web app on Cloudflare.** *Done:* static assets with the single-page-app fallback, `public/_headers` (the `.well-known` files as JSON, caching, security headers), and a reload when an open page can't find a previous build's files. See [Deploying the web app to Cloudflare](#deploying-the-web-app-to-cloudflare).
4. **Slower polling** instead of real-time connections, for launch. *Done.*
   - An open chat checks every 8 seconds while messages are coming, and every 30 once nothing's been sent or received for a minute (`chatPollIntervalMs`). Sending, or a new message arriving, makes it quick again.
   - The chat list and the bell check once a minute.
   - Everything checks straight away when the app or tab comes back to the foreground, and nothing polls while it's hidden. Pushes cover the app being closed.
   - Pull-to-refresh on Feed, Chats and Notifications, at most once every 5 seconds (`usePullToRefresh`): a pull sooner than that just closes the spinner.
   - Roughly: someone with the app open but idle makes about 2 requests a minute, and an active chat about 8 while it lasts.
   - Later, if chats feel slow: real-time hints over WebSockets, from a Durable Object per user (or in-process on a long-running server). Events would be hints ("chat X has new messages"), and the app would fetch through tRPC as now, so they'd slot in behind the same refresh code. Polling would stay as the fallback.
5. **Sentry in the app.** *Done:* `@sentry/capacitor`: errors in the web app, and errors and native crashes in the iOS and Android apps, with source maps uploaded by the build. See [Error reporting in the app](#error-reporting-in-the-app-sentry). Sentry's free plan has about 5,000 errors a month for one user; the Team plan (about $26 a month) adds users and 50,000 errors, with a spending cap.

### Test environment

- **Database:** a Neon `staging` branch (a copy-on-write copy that pauses itself when idle, so it costs almost nothing), and optionally a branch per PR from Neon's GitHub Action, deleted when the PR closes.
- **API:** a `staging` environment in the Wrangler config: its own Worker, secrets, bindings, Hyperdrive (pointing at the staging branch) and R2 bucket. Pay-per-request, so idle staging is free. `wrangler versions upload` gives each version a preview URL.
- **Apps:** a staging build sets `VITE_API_URL` to the staging API; TestFlight builds could use staging from a separate kind of tag (e.g. `v1.2.0-beta.1`).
- **Web app previews:** Workers Builds already makes a preview URL per branch. For them to sign in, their build points `VITE_API_URL` at the staging API, and the staging API accepts the preview addresses (today `WEB_APP_URL` is a single origin, so accepting every preview needs a small change to the API's CORS).

## Deployment

### Deploying the API to Cloudflare

The API runs on Cloudflare Workers, built by Nitro's Cloudflare preset with `apps/api/wrangler.jsonc` merged in. On Workers:

- **Postgres through Hyperdrive.** Each request (and each Cron Trigger and queue batch) gets its own database client, connected to Hyperdrive, which keeps pooled connections to Neon. `DATABASE_URL` isn't used by the Worker.
- **Per-minute rate limits** are Rate Limiting bindings, one per rule. The limits guarding email stay in Postgres. See [Cache](#cache-redis-optional).
- **Pushes:** saving a notification or chat message queues a message, delayed until the push is due, and the queue's consumer runs a delivery round (which sends everything due). There's no schedule for pushes, so the database can go idle: if a queue message is lost, its pushes go with the next round, or not at all once they're an hour old.
- **The daily jobs** (purging deleted accounts, sweeping orphaned photo files) run on a Cron Trigger at 03:17 UTC.
- **Logs** are in Workers Observability (the Worker's Logs tab). Errors go to Sentry, like on a server, through `@sentry/cloudflare`. See [Error reporting](#error-reporting-sentry).

**Setting it up** (once, with `bunx wrangler@4.166.0 login` first):

1. **Workers Paid plan** ($5 a month), for the CPU time sign-in and tRPC need, and for Queues.
2. **Neon:** create the project and database, and run the migrations against its **direct** connection string, from a checkout with `apps/api/.env.local`: `DATABASE_URL=<Neon's direct URL> bun run --cwd apps/api db:migrate`.
3. **Hyperdrive,** with query caching off. The app reads what it just wrote, and Hyperdrive doesn't clear its cache on writes:
   ```sh
   bunx wrangler@4.166.0 hyperdrive create placeholder-db --connection-string="<Neon's direct URL>" --caching-disabled
   ```
   Put the id it prints in `hyperdrive[0].id` in `apps/api/wrangler.jsonc`.
4. **The push queue:** `bunx wrangler@4.166.0 queues create placeholder-push-delivery`.
5. **Variables and secrets.** `NODE_ENV` and `CLIENT_IP_HEADER` are set in `wrangler.jsonc`. Set the rest with `bunx wrangler@4.166.0 secret put <NAME>` from `apps/api`, or in the dashboard. Deploys keep them (`keep_vars`).
   - `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the API's own address), `WEB_APP_URL`, and Google and Apple sign-in if used.
   - The `STORAGE_*` settings for R2. See [Object storage](#object-storage-cloudflare-r2).
   - Email: `EMAIL_PROVIDER` and its settings. See [Email](#email).
   - Push: `PUSH_PROVIDER=fcm` and `FCM_SERVICE_ACCOUNT_JSON`. See [Push notifications](#push-notifications).
   - Errors: `SENTRY_DSN`, and optionally `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE`. See [Error reporting](#error-reporting-sentry).
6. **Names:** the Worker's `name` and the queue's name in `wrangler.jsonc` are placeholders; rename both before the first deploy if you like.
7. **Deploy:** `bun run --cwd apps/api build:cloudflare && bun run --cwd apps/api deploy:cloudflare`. Then give the Worker a custom domain (Workers → the Worker → Settings → Domains & Routes), e.g. `api.example.com`.

**Trying it locally:** `bun run --cwd apps/api build:cloudflare`, then `bun run --cwd apps/api dev:cloudflare` runs it in `wrangler dev`, on Cloudflare's runtime, with the settings in `apps/api/.env.local` (and `NODE_ENV=development`, so the console email provider works).
- It connects to `localConnectionString` in `wrangler.jsonc` (the docker-compose Postgres), or to `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` if set. Hyperdrive's local mode needs a password in the URL.
- Cron Triggers don't run on their own there: `curl "localhost:8787/cdn-cgi/local/scheduled?cron=17+3+*+*+*"` runs one.
- `bun run --cwd apps/api smoke:workers` runs the check CI does (signing up, a push through the queue, the Cron Triggers, a rate limit) on the last `build:cloudflare`, against `WORKERS_SMOKE_DATABASE_URL`, a migrated database.

### Deploying the web app to Cloudflare

The web app is static files (the Vite build), served by Cloudflare Workers with no Worker script of its own (`apps/app/wrangler.jsonc`):

- **Any path that isn't a file loads the app** (`not_found_handling: "single-page-application"`), so a shared link like `/profile/sam` or a refresh on `/chats/…` works.
- **`apps/app/public/_headers`,** copied into the build:
  - serves `/.well-known/apple-app-site-association` as JSON (see [Links that open the app](#links-that-open-the-app));
  - caches `/assets/*` for a year (their names change with every build; `index.html` isn't cached);
  - adds `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options` to every response.
- **After a deploy,** a page opened before it can't find the previous build's files: Cloudflare keeps only the current build, and answers with `index.html`. When a lazily loaded part (the Admin screen) fails to load, the app reloads once and picks up the new build (`src/lib/reloadOnStaleBuild.ts`).
- Static files are free on Workers, with no bandwidth charge.

**Setting it up**, with Workers Builds (deploys from GitHub on every push to `main`, and a preview URL for every other branch):

1. In the Cloudflare dashboard: Workers & Pages → Create → Import a repository, and pick this repository.
2. Build settings:
   - Root directory: `/` (the repository: the app needs the workspace's install).
   - Build command: `bun install --frozen-lockfile && bun run --cwd apps/app build`
   - Deploy command: `cd apps/app && npx wrangler deploy`
   - Preview command (other branches): `cd apps/app && npx wrangler preview`
3. Build variables: `VITE_API_URL` (the API's address), `VITE_PUBLIC_URL` (the web app's own address, e.g. `https://app.example.com`) and `VITE_MEDIA_URL` (the media domain). They're compiled into the app, so a change needs a new build. For error reporting, also `VITE_SENTRY_DSN`, plus `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_RELEASE` (e.g. `web@$WORKERS_CI_COMMIT_SHA`) to upload source maps: see [Error reporting in the app](#error-reporting-in-the-app-sentry).
4. Give the Worker its custom domain (Settings → Domains & Routes), the same one as `VITE_PUBLIC_URL`, and set the API's `WEB_APP_URL` to it, so the API's CORS and sign-in accept the app.
5. The Worker's `name` in `wrangler.jsonc` is a placeholder; rename it before the first deploy if you like.

Preview builds call the same API, which only accepts `WEB_APP_URL`, so signing in from a preview URL is refused until there's a staging API that allows it (see [Test environment](#test-environment)).

Without Workers Builds: `bun run --cwd apps/app build` (with the `VITE_*` variables set), then `bun run --cwd apps/app deploy:cloudflare`.

**Trying it locally:** after a build, `bun run --cwd apps/app dev:cloudflare` serves `dist` as Cloudflare will, and `bun run --cwd apps/app smoke:cloudflare` checks it (CI runs that too).

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

Sign-in codes and account deletion codes go by email. Locally they're written to the API's log (`EMAIL_PROVIDER=console`); in production the API won't start until a real provider is set. Both Resend and Mailgun are supported, through their REST APIs (the `EmailSender` interface in `apps/api/src/domains/notifications/email/delivery`, so another provider is one file).

1. **Verify a sending domain** with the provider, ideally a subdomain such as `mail.example.com`, so its reputation is separate from your main domain's. Add the DNS records it gives you: SPF and DKIM for sending, and a return-path (bounce) record. Mailgun calls the domain `MAILGUN_DOMAIN`; Resend just needs it verified.
2. **Add a DMARC record** for the domain (`_dmarc`, e.g. `v=DMARC1; p=none; rua=mailto:dmarc@example.com` to start, then `p=quarantine` once reports look clean). Gmail and Yahoo require one from bulk senders, and it helps codes reach the inbox.
3. **Set the API's environment:**
   - Resend: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`, e.g. `Placeholder <no-reply@mail.example.com>`.
   - Mailgun: `EMAIL_PROVIDER=mailgun`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION` (`us` or `eu`, where the account was created) and `EMAIL_FROM`.

   A provider chosen without its settings stops the API at startup, naming what's missing.
4. **Pick a plan that covers sign-ins.** Every sign-in sends an email, and free tiers stop at 100 a day.

A send that fails is logged and reported to Sentry, with the provider's status and reason but never the code.

**Limits on sending codes** (`apps/api/src/infra/rate-limiting/constants`), so nobody can flood an inbox or run up the bill:

- Sign-in codes: 5 per 15 minutes and 10 a day per email address; 10 per 15 minutes and 30 a day per IP address.
- Account deletion codes: 3 per 15 minutes and 10 a day per person.
- **An hourly budget for all email together,** `EMAIL_HOURLY_LIMIT` (default 300), which a bot spread across many addresses and IPs can't get past. It counts only codes the other limits let through. Once it's used up, codes are refused until the hour is up, and Sentry is told (once an hour). Raise it as the app grows.
- These limits are counted in Postgres (`rate_limit_counters`), exactly, across every instance. If the database can't be reached, no codes are sent, rather than sent without limits.

### Push notifications

Pushes go through Firebase Cloud Messaging (FCM) to both platforms: Android directly, iOS through Apple's push service with your APNs key. Each device registers its FCM token with the API while someone is signed in on it; signing out (or being signed out) removes it.

- **What's pushed:** every notification in the bell, in the same words (`describeNotification`), once its delivery time comes (after `NOTIFICATION_DELAY_SECONDS`), unless it's been undone since (an unfollow, a mention edited out…) or the person turned that kind off in Settings (new messages, comments, mentions, follows; warnings and report outcomes always go). New chat messages too, `CHAT_PUSH_DELAY_SECONDS` (10) after the first one not yet pushed, unless they've read the chat by then: one push per chat, saying how many are new, that replaces the previous one for that chat on the device. The badge on iOS is the number on the bell. Anything that's waited more than an hour (`pushMaxAgeSeconds`), because its wake-up was lost or the API was down, isn't pushed: it's still in the bell and the chat list, and a push that late is noise.
- **How:** the API checks every `PUSH_DELIVERY_INTERVAL_SECONDS` (5) for what's due. Several instances can run at once; each notification and chat is taken by one. On a host without a long-running process, set it to 0 and run `bun run --cwd apps/api push:deliver` from a scheduler instead. On Workers there's no loop: saving a notification or chat message queues a message for when its push is due (see [Deploying the API to Cloudflare](#deploying-the-api-to-cloudflare)).

**Setting it up:**

1. Create a Firebase project, and add an Android app and an iOS app to it with the app id (see the launch checklist). Put the two files it gives you in the native projects: `google-services.json` in `apps/app/android/app/`, and `GoogleService-Info.plist` in `apps/app/ios/App/App/` (a build step copies it into the app; there's nothing to add in Xcode). For release builds, it comes from the `IOS_GOOGLE_SERVICE_INFO_PLIST` secret instead: see [Releasing the iOS app](#releasing-the-ios-app). They aren't secret (they identify the app to Firebase; sending needs the service account below). Without them the apps still build and run, with push off.
2. In your Apple Developer account, create an APNs authentication key (`.p8`) and upload it in Firebase: Project settings → Cloud Messaging → Apple app configuration.
3. In Firebase: Project settings → Service accounts → Generate new private key. Set the API's `PUSH_PROVIDER=fcm` and `FCM_SERVICE_ACCOUNT_JSON` to that file's contents (it's a secret: keep it out of the repository).

Locally, `PUSH_PROVIDER=console` logs each push instead.

**In the app** (`@capacitor-firebase/messaging`, native only; `apps/app/src/domains/notifications`):

- **Asking:** not when the app opens. After someone sends a message, follows someone or comments, the app asks "Turn on notifications?" with the reason, and only on "Turn on" shows the system's question (which iOS allows only once). After "Not now" it waits 30 days. Settings → Notifications has a Turn on button too, and points to the phone's settings if they were turned off there.
- **Each device** registers its token with the API once someone has signed up and allowed notifications, and again whenever Firebase changes it.
- **Tapping** a notification opens what it's about (the `path` the API sends).
- **Settings → Notifications:** the four kinds, for every device they're signed in on. On the web it explains that pushes come to the apps.
- iOS has the Push Notifications entitlement (`App.entitlements`) and the remote-notification background mode. On Android, a notification icon (white on transparent) can be added later; until then Android uses the app icon.

### Links that open the app

With the app installed, a link to the app's web address (`VITE_PUBLIC_URL`, such as a shared profile) opens that screen in the app instead of the browser: a Universal Link on iOS, an App Link on Android. Without the app, it opens the web app as before. `DeepLinksBridge` (`apps/app/src/app`) takes the link's path and opens it, both when a link starts the app and when the app is already running; links to anywhere else are ignored.

Each platform checks, when the app is installed, that the website agrees, using a file it fetches from the web address:

- **iOS:** `/.well-known/apple-app-site-association`, which names the app as `<team id>.<app id>` (your team id is in your Apple Developer account, under Membership). The app's Associated Domains entitlement (`applinks:<host>` in `apps/app/ios/App/App/App.entitlements`) names the website. The Associated Domains capability has to be on for the app id in your Apple Developer account, like Push Notifications.
- **Android:** `/.well-known/assetlinks.json`, which names the app id and the SHA-256 fingerprint of the key the app is signed with. With Play App Signing that's Google's key, not yours: Play Console → Test and release → App integrity → App signing shows its fingerprint (add your upload key's too if you install builds signed with it). The app's intent filter (`AndroidManifest.xml`) takes its host from `appLinksHost` in `apps/app/android/app/build.gradle`.

Both files are in `apps/app/public/.well-known/` with **placeholders**, and are copied into the web build. Whatever serves the web app has to serve them as they are, over HTTPS without redirects, with `Content-Type: application/json` (the Apple one has no extension, so set it), and not the app's `index.html` in their place. On Cloudflare, `apps/app/public/_headers` does that (see [Deploying the web app to Cloudflare](#deploying-the-web-app-to-cloudflare)). Check them with Apple's `https://app-site-association.cdn-apple.com/a/v1/<host>` (Apple fetches the file through its CDN, so a change can take a day to arrive) and Google's [Statement List Tester](https://developers.google.com/digital-asset-links/tools/generator). On Android, `adb shell pm get-app-links <app id>` shows whether the host was verified.

### Releasing the iOS app

Pushing a version tag builds a signed release on GitHub Actions and uploads it to TestFlight (`.github/workflows/release-ios.yml`, with fastlane in `apps/app/ios/App/fastlane`):

```sh
git tag v1.0.0 && git push origin v1.0.0
```

The tag is the version people see (`1.0.0`); the build number is the workflow's run number, so every build is higher than the last. A new version has to be higher than the last one released on the App Store; more builds of the same version are fine for TestFlight. Apple takes a while to process an upload, then it shows in TestFlight in App Store Connect. A failed release can be run again from the Actions tab; one that already uploaded needs a new tag (the same build number can't be uploaded twice).

Signing uses fastlane [match](https://docs.fastlane.tools/actions/match/): the App Store certificate and profile are kept encrypted in a separate private git repository, and the release reads them from there. No Mac is needed: a workflow makes them.

**Setting it up** (once):

1. **Apple Developer account** (paid). In Certificates, Identifiers & Profiles, register the app id (the real one: see the launch checklist) with the **Push Notifications** and **Associated Domains** capabilities. In [App Store Connect](https://appstoreconnect.apple.com), create the app with that id.
2. **An App Store Connect API key:** Users and Access → Integrations → App Store Connect API → Team Keys, with the **Admin** role (match creates certificates; once they exist, App Manager is enough). Download the `.p8` (only possible once) and note its key id and the issuer id.
3. **A private GitHub repository for the certificates**, empty, with no README (e.g. `yourname/ios-certificates`). Then a fine-grained personal access token (GitHub → Settings → Developer settings → Fine-grained tokens) with access to only that repository and Contents: Read and write. When the token expires, releases fail until you replace the secret.
4. **In this repository's Settings → Secrets and variables → Actions:**
   - Secrets:
     - `ASC_KEY_ID` and `ASC_ISSUER_ID`: from step 2.
     - `ASC_KEY_P8`: the `.p8` file's whole contents, including the `BEGIN` and `END` lines (open it in a text editor and copy it all). Not base64-encoded.
     - `MATCH_PASSWORD`: a long random password that encrypts the certificates repository. Keep a copy: without it they can't be read.
     - `MATCH_GIT_BASIC_AUTHORIZATION`: `yourname:token` from step 3, base64-encoded:
       - macOS or Linux: `echo -n 'yourname:token' | base64`
       - Windows (PowerShell): `[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("yourname:token"))`
     - `IOS_GOOGLE_SERVICE_INFO_PLIST`: `GoogleService-Info.plist` base64-encoded. Without it a release builds without push notifications, with a warning.
       - macOS or Linux: `base64 -i GoogleService-Info.plist`
       - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\GoogleService-Info.plist"))`
   - Variables:
     - `APPLE_TEAM_ID`: your team id (Membership in your Apple Developer account).
     - `MATCH_GIT_URL`: the certificates repository's address, e.g. `https://github.com/yourname/ios-certificates.git`.
     - `VITE_API_URL`, `VITE_PUBLIC_URL` and `VITE_MEDIA_URL`: the real addresses the app is built with.
     - Optionally, for errors and crashes (see [Error reporting in the app](#error-reporting-in-the-app-sentry)): the variables `VITE_SENTRY_DSN`, `SENTRY_ORG` and `SENTRY_APP_PROJECT`, and the secret `SENTRY_AUTH_TOKEN`. Each release's source maps are uploaded as `ios@<tag>`.
5. **Run "iOS certificates"** from the Actions tab (`.github/workflows/ios-certificates.yml`). It creates the certificate and profile and stores them in the certificates repository. Run it again with "Renew the profile" after turning on another capability for the app id, and again when the certificate expires (yearly).
6. Push a tag.

**The review account.** App Review has to sign in, and sign-in is a code emailed to the address, which a reviewer can't receive. So the API can have one review account that signs in with a fixed code and is sent no email:

1. Pick an address for it that no one uses, e.g. `app-review@yourdomain.com`, and a 6-digit code, and set them on the API: `REVIEW_ACCOUNT_EMAIL` and `REVIEW_ACCOUNT_CODE` (secrets, like the others).
2. In App Store Connect → the app → App Review Information → Sign-In Information, give that email as the user name and the code as the password, with a note: "Enter the email on the sign-in screen, then this code when asked for the code. No email is sent." Play Console's App access section takes the same.
3. Sign in with it once yourself and finish sign-up (a name, and a birth date over 13), so reviewers land in the app. Post something, follow someone, and start a chat with another test account, so there's something to look at.

Only that address gets the fixed code, and only for signing in. The usual limits still apply (3 tries per code, 10 codes a day per address, the per-IP limits), which allows about 30 guesses a day against a million codes. Keep it an ordinary account (never an admin), and remove the two settings after review if you like: the account then needs an emailed code like anyone else.

**Without a Mac** (Xcode only runs on macOS), this is how to try the iOS app on an iPhone: push a tag, then install the build from the TestFlight app once Apple has processed it (about 20–30 minutes in all). Push notifications and Universal Links need a real phone and a signed build anyway. Day to day, work in the browser (and Android Studio, which runs on Windows); the iOS simulator build on PRs shows when a change breaks the iOS build.

On a Mac, Xcode still signs debug builds automatically with your own account: the release lane switches the App target to match's profile only for its own build.

### Cache (Redis, optional)

The API's cache holds the per-minute rate-limit counters (everything under `/api/auth`, tRPC queries and mutations). With `REDIS_URL` set it's Redis, shared by every instance; without it, each instance counts in its own memory. That's fine for these limits, which only slow down abuse: with several instances, someone could get up to that many times the limit. Any Redis 7 works, e.g. Upstash.

Rate limits go through a `RateLimiter` interface (`apps/api/src/infra/rate-limiting`), which sends each rule by its window: rules with a 10 or 60 second window to the cache, which is fast enough to check on every request, and every other rule (sending and using codes, the email budget) to Postgres, which counts exactly. On Cloudflare Workers, the Rate Limiting binding would take the cache's place (see [Hosting plan](#hosting-plan-not-built-yet)). A rule's window decides where it's counted, so a new rule that guards something costly needs a window other than 10 or 60 seconds; a test checks that every rule guarding email is counted in Postgres.

- Optionally set `REDIS_URL`, e.g. `rediss://default:<password>@<host>:6379`.
- Set `CLIENT_IP_HEADER` to the header your proxy or CDN puts the caller's IP address in, e.g. `cf-connecting-ip` behind Cloudflare. The default is `x-forwarded-for`. Rate limits per IP trust this header, so the API must only be reachable through that proxy.
- `/api/ready` needs only the database. With Redis, it also reports `cache: true` or `false`, but a Redis outage doesn't fail it: the API keeps serving with the per-minute limits off, and logs it. The limits on sending codes are in Postgres, so they still hold.

### Error reporting (Sentry)

The API's errors (the app's are below, in [Error reporting in the app](#error-reporting-in-the-app-sentry)).


Unexpected errors (what the client sees as "Something went wrong") are reported to Sentry, along with uncaught exceptions and unhandled rejections. Expected failures (validation, not found, forbidden, rate limited) aren't reported. Traces stay on OpenTelemetry (on Workers, in Workers Observability): Sentry sends errors only. It goes through an `ErrorReporter` interface in `apps/api/src/infra/observability/errors`, so the tracker can be swapped. The `#sentry-error-reporter` import picks the SDK when the API is built: `@sentry/node` on a server, `@sentry/cloudflare` on Workers. On Workers, the client starts with the first error (Workers don't allow it at startup), and each report is sent in the background, after the response.

- Set `SENTRY_DSN` from the Sentry project's settings. Optionally set `SENTRY_ENVIRONMENT` (defaults to `NODE_ENV`) and `SENTRY_RELEASE`, e.g. the commit SHA.
- A report carries the error, its stack, the request id, the procedure, the method and path, and the signed-in user's id. It doesn't carry cookies, headers (other than the user agent), bodies, query parameters, local variables or database query values. The bound values in query error messages are replaced with `[redacted]`.

### Error reporting in the app (Sentry)

The web app and the iOS and Android apps report to Sentry with `@sentry/capacitor` (`apps/app/src/lib/errorReporting`), when the build has `VITE_SENTRY_DSN`:

- **What's reported:** uncaught errors and rejected promises in the app, and in the native apps also crashes of the app itself (Sentry's iOS and Android SDKs come with the plugin). Errors only: no tracing, no session replay.
- **What a report carries:** the error and its stack, the device and OS, the signed-in user's id (never their email), and the trail of what happened before it, with requests and page changes reduced to their path (no query: tRPC puts its input there) and no console messages (`sanitizeBreadcrumb`). Unexpected API errors are reported by the API itself (above).
- **Readable stacks:** with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` set for the build, the Vite build makes source maps, uploads them under `SENTRY_RELEASE` (e.g. the commit SHA, or `ios@v1.2.0`), and deletes them from `dist`, so they're never served. Without the token, builds are as before.
- **Settings:** `VITE_SENTRY_DSN` (the app's Sentry project; a separate project from the API's keeps them apart), optionally `VITE_SENTRY_ENVIRONMENT` (the Vite mode by default), and the auth token from Sentry → Settings → Auth Tokens (with project write and release permissions). Set them in Workers Builds for the web app, and in the repository's Actions settings for iOS releases (see [Releasing the iOS app](#releasing-the-ios-app)).
- **Privacy:** Sentry receives crash and error data. The privacy policy already lists it (for error reports); also declare "Crash Data" and "Other Diagnostic Data" (linked to the user's id) in the App Store's privacy details and Play's Data safety form.

### Health checks

- `GET /api/health`: liveness. The process is up.
- `GET /api/ready`: readiness. It returns 503 when the database can't be reached, and also reports whether the cache can.
