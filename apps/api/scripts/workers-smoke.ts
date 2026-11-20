/**
 * `bun run smoke:workers`: runs the Workers build (`bun run build:cloudflare` first) in `wrangler dev`,
 * on Cloudflare's own runtime, against a migrated Postgres (WORKERS_SMOKE_DATABASE_URL, reached
 * the way Hyperdrive is locally), and checks it end to end:
 *
 * - the database answers, one request after another and at the same time (a client per request);
 * - two people sign up with emailed codes and finish sign-up;
 * - a chat message to someone with a push token is pushed, through the push queue;
 * - both Cron Triggers run;
 * - the per-minute auth limit (a Rate Limiting binding) refuses past 60.
 *
 * Emails and pushes go to the log (EMAIL_PROVIDER and PUSH_PROVIDER "console"), which is read for
 * the sign-in codes and the push. Storage isn't there, so the daily photo sweep logs a failure;
 * only the Cron Trigger itself has to succeed.
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ulid } from "ulid";
import { currentTermsVersion } from "@myapp/shared/domains";

const databaseUrl = process.env.WORKERS_SMOKE_DATABASE_URL;
if (!databaseUrl) {
    console.error("Set WORKERS_SMOKE_DATABASE_URL to a migrated Postgres with a password in it (Hyperdrive's local mode needs one), e.g. postgresql://postgres:postgres@localhost:5432/app");
    process.exit(1);
}
const port = Number(process.env.WORKERS_SMOKE_PORT ?? 8788);
const base = `http://127.0.0.1:${port}`;
const webAppUrl = "http://localhost:5173";

const envFile = path.join(mkdtempSync(path.join(tmpdir(), "workers-smoke-")), ".env");
writeFileSync(envFile, [
    "NODE_ENV=development",
    "BETTER_AUTH_SECRET=workers-smoke-secret-workers-smoke-secret",
    `BETTER_AUTH_URL=${base}`,
    `WEB_APP_URL=${webAppUrl}`,
    "STORAGE_ENDPOINT=http://127.0.0.1:1",
    "STORAGE_REGION=smoke",
    "STORAGE_ACCESS_KEY_ID=smoke",
    "STORAGE_SECRET_ACCESS_KEY=smoke",
    "STORAGE_UPLOADS_BUCKET=smoke-uploads",
    "STORAGE_MEDIA_BUCKET=smoke-media",
    "STORAGE_MEDIA_PUBLIC_URL=http://127.0.0.1:1",
    "PUSH_PROVIDER=console",
    // Short delays, so the queued push arrives within the check.
    "CHAT_PUSH_DELAY_SECONDS=1",
    "NOTIFICATION_DELAY_SECONDS=0",
].join("\n"));

const worker = Bun.spawn(["bunx", "wrangler@4.166.0", "dev", "--port", String(port), "--ip", "127.0.0.1", "--env-file", envFile], {
    cwd: path.resolve(import.meta.dir, ".."),
    env: { ...process.env, CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: databaseUrl, WRANGLER_SEND_METRICS: "false" },
    stdout: "pipe",
    stderr: "pipe",
});
// eslint-disable-next-line no-control-regex -- matching the escape character is the point
const ansiColour = /\x1b\[[0-9;]*m/g;
let output = "";
for (const stream of [worker.stdout, worker.stderr]) {
    void (async () => {
        const decoder = new TextDecoder();
        for await (const chunk of stream) {
            // Without the colours, so it can be searched.
            output += decoder.decode(chunk).replace(ansiColour, "");
        }
    })();
}

let failed = false;
function check(ok: boolean, what: string) {
    console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
    failed ||= !ok;
}

async function waitFor<T>(what: string, find: () => Promise<T | null | undefined> | T | null | undefined, timeoutMs: number): Promise<T> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const found = await find();
        if (found) {
            return found;
        }
        await Bun.sleep(250);
    }
    throw new Error(`Timed out waiting for ${what}`);
}

const json = { "Content-Type": "application/json", Origin: webAppUrl };

async function call<T>(token: string, procedure: string, input: unknown, kind: "query" | "mutation"): Promise<T> {
    const headers = { ...json, Authorization: `Bearer ${token}` };
    const response = kind === "query"
        ? await fetch(`${base}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`, { headers })
        : await fetch(`${base}/api/trpc/${procedure}`, { method: "POST", headers, body: JSON.stringify(input) });
    const body = await response.json() as { result?: { data: { ok: boolean; value: T } }; error?: unknown };
    if (!response.ok || !body.result?.data.ok) {
        throw new Error(`${procedure} failed (${response.status}): ${JSON.stringify(body)}`);
    }
    return body.result.data.value;
}

/** Signs up `name` with an emailed code, finishes sign-up, and returns their session token and username. */
async function signUp(name: string): Promise<{ token: string; username: string }> {
    const email = `${name}-${Date.now()}@example.test`;
    const sent = await fetch(`${base}/api/auth/email-otp/send-verification-otp`, { method: "POST", headers: json, body: JSON.stringify({ email, type: "sign-in" }) });
    if (!sent.ok) {
        throw new Error(`Sending ${name}'s code failed: ${sent.status} ${await sent.text()}`);
    }
    const code = await waitFor(`${name}'s code`, () => new RegExp(`${email.replace(/[.+]/g, "\\$&")}[\\s\\S]*?\\b(\\d{6})\\b`).exec(output)?.[1], 10_000);
    const signedIn = await fetch(`${base}/api/auth/sign-in/email-otp`, { method: "POST", headers: json, body: JSON.stringify({ email, otp: code }) });
    const { token } = await signedIn.json() as { token: string };
    const username = `${name}${Date.now().toString().slice(-6)}`;
    await call(token, "auth.signUp", { username, firstName: name, lastName: null, about: null, acceptedTermsVersion: currentTermsVersion, birthYear: 1990, birthMonth: 1 }, "mutation");
    return { token, username };
}

try {
    await waitFor("wrangler dev", async () => (await fetch(`${base}/api/health`).catch(() => null))?.ok, 120_000);

    const ready = await Promise.all(Array.from({ length: 6 }, async () => (await fetch(`${base}/api/ready`)).json() as Promise<{ ok: boolean }>));
    check(ready.every((answer) => answer.ok), "the database answers six requests at the same time (a client per request, through the Hyperdrive binding)");

    const ann = await signUp("ann");
    const sam = await signUp("sam");
    const me = await call<{ profile: { username: string } | null }>(ann.token, "users.me", {}, "query");
    check(me.profile?.username === ann.username, "signing up with an emailed code, and tRPC as the new user");

    await call(sam.token, "notifications.registerPushToken", { token: `smoke-device-${ulid()}`, platform: "ios" }, "mutation");
    const chat = await call<{ id: string }>(ann.token, "chats.getOrCreateDirectChat", { id: ulid(), username: sam.username }, "mutation");
    await call(ann.token, "chats.sendMessage", { id: ulid(), chatId: chat.id, content: "Is it still for sale?" }, "mutation");
    const pushed = await waitFor("the push", () => output.includes("Push (not sent: PUSH_PROVIDER is console)") && output.includes("Is it still for sale?"), 20_000).catch(() => false);
    check(pushed === true, "a chat message is pushed through the push queue");

    for (const cron of ["* * * * *", "17 3 * * *"]) {
        const result = await fetch(`${base}/cdn-cgi/local/scheduled?format=json&cron=${encodeURIComponent(cron)}`);
        const outcome = (await result.json() as { outcome: string }).outcome;
        check(outcome === "ok", `the Cron Trigger "${cron}" runs`);
    }

    const statuses = [];
    for (let i = 0; i < 65; i++) {
        statuses.push((await fetch(`${base}/api/auth/get-session`, { headers: json })).status);
    }
    check(statuses.includes(429), "the per-minute auth limit (a Rate Limiting binding) refuses past its limit");
} catch (error) {
    check(false, String(error));
} finally {
    worker.kill();
}

if (failed) {
    console.log("--- wrangler dev output\n" + output);
    process.exit(1);
}
