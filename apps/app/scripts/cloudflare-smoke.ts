/**
 * `bun run smoke:cloudflare`: serves the last build (`bun run build`) the way Cloudflare will
 * (`wrangler dev` with wrangler.jsonc and public/_headers) and checks what the app needs from it:
 *
 * - pages the app routes itself (a shared profile, a post) load the app;
 * - the Universal Links / App Links files are served as JSON;
 * - built scripts are cached for good (a missing one gets index.html, like any other path, so the
 *   app reloads itself when an old page asks for a previous build's file: reloadOnStaleBuild);
 * - the security headers are on every response.
 */
import path from "node:path";

const port = Number(process.env.SMOKE_PORT ?? 8791);
const base = `http://127.0.0.1:${port}`;
const appDir = path.resolve(import.meta.dir, "..");

const server = Bun.spawn(["bunx", "wrangler@4.166.0", "dev", "--port", String(port), "--ip", "127.0.0.1"], {
    cwd: appDir,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdout: "pipe",
    stderr: "pipe",
});
let output = "";
for (const stream of [server.stdout, server.stderr]) {
    void (async () => {
        const decoder = new TextDecoder();
        for await (const chunk of stream) {
            output += decoder.decode(chunk);
        }
    })();
}

let failed = false;
function check(ok: boolean, what: string) {
    console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
    failed ||= !ok;
}

/** A browser opening a page (what Cloudflare's single-page-application mode answers with index.html). */
const navigate = (pathname: string) => fetch(`${base}${pathname}`, { headers: { "Sec-Fetch-Mode": "navigate", Accept: "text/html" } });

try {
    const started = Date.now();
    while (!(await fetch(base).catch(() => null))?.ok) {
        if (Date.now() - started > 120_000) {
            throw new Error("wrangler dev didn't start");
        }
        await Bun.sleep(250);
    }

    const home = await navigate("/");
    const homeHtml = await home.text();
    check(home.status === 200 && homeHtml.includes('<div id="root">'), "/ serves the app");
    for (const page of ["/profile/sam", "/feed/posts/01JPOST", "/delete-account"]) {
        const response = await navigate(page);
        check(response.status === 200 && (await response.text()) === homeHtml, `${page} loads the app (index.html)`);
    }

    for (const file of ["/.well-known/apple-app-site-association", "/.well-known/assetlinks.json"]) {
        const response = await fetch(`${base}${file}`);
        const body = await response.text();
        let isJson = true;
        try {
            JSON.parse(body);
        } catch {
            isJson = false;
        }
        check(response.status === 200 && response.headers.get("content-type")?.startsWith("application/json") === true && isJson, `${file} is served as JSON (${response.headers.get("content-type")})`);
    }

    const script = /src="(\/assets\/[^"]+\.js)"/.exec(homeHtml)?.[1];
    const asset = script ? await fetch(`${base}${script}`) : null;
    check(asset?.status === 200 && asset.headers.get("cache-control") === "public, max-age=31536000, immutable", `built scripts are cached for good (${script ?? "none found"})`);

    check(home.headers.get("x-content-type-options") === "nosniff" && home.headers.get("x-frame-options") === "DENY", "security headers are on responses");
} catch (error) {
    check(false, String(error));
} finally {
    server.kill();
}

if (failed) {
    console.log("--- wrangler dev output\n" + output);
    process.exit(1);
}
