import { describe, expect, it } from "bun:test";
import type { AwsClient } from "aws4fetch";
import { deleteObjects } from "./deleteObjects";

/** A client whose DELETEs answer `status(url)` after a tick, counting how many run at once. */
function fakeClient(status: (url: string) => number) {
    const seen = { running: 0, most: 0, urls: [] as string[] };
    const client = {
        fetch: async (url: string) => {
            seen.running += 1;
            seen.most = Math.max(seen.most, seen.running);
            seen.urls.push(url);
            await new Promise((resolve) => setTimeout(resolve, 1));
            seen.running -= 1;
            return new Response(null, { status: status(url) });
        },
    } as unknown as AwsClient;
    return { client, seen };
}

const keys = Array.from({ length: 30 }, (_, i) => `u/p/m${i}-320`);

describe("deleteObjects", () => {
    it("deletes every key, at most 10 at a time", async () => {
        const { client, seen } = fakeClient(() => 204);
        await deleteObjects({ client, endpoint: "http://s3", bucket: "media", keys });
        expect(seen.urls).toHaveLength(30);
        expect(seen.most).toBe(10);
    });

    it("tries every key even when some fail, then throws once for all of them (already gone counts as deleted)", async () => {
        const { client, seen } = fakeClient((url) => (url.endsWith("m3-320") || url.endsWith("m7-320") ? 500 : url.endsWith("m5-320") ? 404 : 204));
        const error = await deleteObjects({ client, endpoint: "http://s3", bucket: "media", keys }).catch((err: unknown) => err);
        expect(seen.urls).toHaveLength(30);
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toHaveLength(2);
    });
});
