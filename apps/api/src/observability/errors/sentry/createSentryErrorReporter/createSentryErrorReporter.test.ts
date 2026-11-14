import { afterAll, expect, test } from "bun:test";

import { createSentryErrorReporter } from "./createSentryErrorReporter";

// A stand-in for Sentry's ingest endpoint: collects the envelopes the SDK sends.
const envelopes: string[] = [];
const server = Bun.serve({
    port: 0,
    async fetch(req) {
        const body = await req.text();
        envelopes.push(body);
        return new Response("{}");
    },
});
afterAll(() => server.stop());

const reporter = createSentryErrorReporter({ dsn: `http://public@127.0.0.1:${server.port}/1`, environment: "test" });

/** The error events in the envelopes received so far. */
function sentEvents() {
    return envelopes.flatMap((envelope) => envelope.split("\n").filter((line) => line.includes('"exception"')).map((line) => JSON.parse(line)));
}

test("reports the error with the request ids, and redacts query values", async () => {
    const error = new Error("Failed query: insert into \"users\" (\"email\") values ($1)\nparams: someone@example.com");
    reporter.report({ error, context: { requestId: "req-1", userId: "user-1", method: "POST", path: "/api/trpc/posts.createPost", procedure: "posts.createPost" } });
    await reporter.flush({ timeoutMs: 2000 });

    const [event] = sentEvents();
    expect(event.user).toEqual({ id: "user-1" });
    expect(event.tags).toMatchObject({ request_id: "req-1", procedure: "posts.createPost" });
    expect(event.contexts.request).toEqual({ method: "POST", path: "/api/trpc/posts.createPost" });
    expect(event.exception.values[0].value).toBe("Failed query: insert into \"users\" (\"email\") values ($1)\nparams: [redacted]");
});
