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

### iOS and Android

The native apps are Capacitor 8 projects around the web build: `apps/app/ios` (Xcode, Swift Package Manager, no CocoaPods) and `apps/app/android` (Gradle). They're committed; the web build copied into them isn't.

1. Build the web app with the API's real addresses, since a native app has no localhost to fall back on: `VITE_API_URL=https://… VITE_PUBLIC_URL=https://… VITE_MEDIA_URL=https://… bun run --cwd apps/app cap:sync` builds it and copies it into both projects (it also refreshes the plugins' paths in `node_modules`, so run it after installing packages too). Locally, a phone or emulator reaches your computer's API by its address on the network, not `localhost`.
2. Open `apps/app/ios/App/App.xcodeproj` in Xcode (on a Mac) or `apps/app/android` in Android Studio, and run it.

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
- [ ] **The real app id** (reverse domain, e.g. `com.yourcompany.appname`), which can't change after the first store upload: in `apps/app/capacitor.config.ts`, the Xcode project's bundle identifier (`apps/app/ios/App`), `applicationId` in `apps/app/android/app/build.gradle`, and the API's `APPLE_APP_BUNDLE_IDENTIFIER`. Also the app's name, icons and splash screen.
- [ ] **Signed release builds** to TestFlight and Play's internal testing track: GitHub Actions with fastlane, or a hosted service (Capawesome Cloud, Codemagic). Needs an Apple Developer account and a Google Play developer account.
- [ ] **Schedule the daily jobs** once the API is hosted (a cron job, or Cron Triggers on Workers):
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

### Push notifications

Pushes go through Firebase Cloud Messaging (FCM) to both platforms: Android directly, iOS through Apple's push service with your APNs key. Each device registers its FCM token with the API while someone is signed in on it; signing out (or being signed out) removes it.

- **What's pushed:** every notification in the bell, in the same words (`describeNotification`), once its delivery time comes (after `NOTIFICATION_DELAY_SECONDS`), unless it's been undone since (an unfollow, a mention edited out…) or the person turned that kind off in Settings (new messages, comments, mentions, follows; warnings and report outcomes always go). New chat messages too, `CHAT_PUSH_DELAY_SECONDS` (10) after the first one not yet pushed, unless they've read the chat by then: one push per chat, saying how many are new, that replaces the previous one for that chat on the device. The badge on iOS is the number on the bell.
- **How:** the API checks every `PUSH_DELIVERY_INTERVAL_SECONDS` (5) for what's due. Several instances can run at once; each notification and chat is taken by one. On a host without a long-running process, set it to 0 and run `bun run --cwd apps/api push:deliver` from a scheduler instead.

**Setting it up:**

1. Create a Firebase project, and add an Android app and an iOS app to it with the app id (see the launch checklist). Put the two files it gives you in the native projects: `google-services.json` in `apps/app/android/app/`, and `GoogleService-Info.plist` in `apps/app/ios/App/App/` (in Xcode, add it to the App target). They aren't secret (they identify the app to Firebase; sending needs the service account below). Without them the apps still build and run, with push off.
2. In your Apple Developer account, create an APNs authentication key (`.p8`) and upload it in Firebase: Project settings → Cloud Messaging → Apple app configuration.
3. In Firebase: Project settings → Service accounts → Generate new private key. Set the API's `PUSH_PROVIDER=fcm` and `FCM_SERVICE_ACCOUNT_JSON` to that file's contents (it's a secret: keep it out of the repository).

Locally, `PUSH_PROVIDER=console` logs each push instead.

**In the app** (`@capacitor-firebase/messaging`, native only; `apps/app/src/domains/notifications`):

- **Asking:** not when the app opens. After someone sends a message, follows someone or comments, the app asks "Turn on notifications?" with the reason, and only on "Turn on" shows the system's question (which iOS allows only once). After "Not now" it waits 30 days. Settings → Notifications has a Turn on button too, and points to the phone's settings if they were turned off there.
- **Each device** registers its token with the API once someone has signed up and allowed notifications, and again whenever Firebase changes it.
- **Tapping** a notification opens what it's about (the `path` the API sends).
- **Settings → Notifications:** the four kinds, for every device they're signed in on. On the web it explains that pushes come to the apps.
- iOS has the Push Notifications entitlement (`App.entitlements`) and the remote-notification background mode. On Android, a notification icon (white on transparent) can be added later; until then Android uses the app icon.

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
