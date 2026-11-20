import { expect, mock, test } from "bun:test";
import { createSentryWorkersErrorReporter } from "./createSentryWorkersErrorReporter";

test("sends the error with the ids it's given, redacting query values, in the background", async () => {
    const sent: string[] = [];
    const fetch = mock(async (_url: string | URL | Request, init?: RequestInit) => {
        sent.push(typeof init?.body === "string" ? init.body : new TextDecoder().decode(init?.body as Uint8Array));
        return new Response(null, { status: 200 });
    });
    const background: Promise<unknown>[] = [];
    const reporter = createSentryWorkersErrorReporter({
        dsn: "https://public@sentry.example.test/1",
        environment: "test",
        waitUntil: (promise) => background.push(promise),
        fetch: fetch as unknown as typeof globalThis.fetch,
    });

    reporter.report({ error: new Error("Failed query: select 1\nparams: secret@example.com"), context: { requestId: "req-1", userId: "user-1", procedure: "posts.createPost" } });
    await Promise.all(background);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]![0])).toContain("sentry.example.test/api/1/envelope/");
    const envelope = sent[0]!;
    expect(envelope).toContain('"request_id":"req-1"');
    expect(envelope).toContain('"procedure":"posts.createPost"');
    expect(envelope).toContain('"id":"user-1"');
    expect(envelope).not.toContain("secret@example.com");
});
