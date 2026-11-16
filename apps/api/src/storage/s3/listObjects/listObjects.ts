import type { AwsClient } from "aws4fetch";
import { parseListObjectsResponse, type ListedObject } from "../parseListObjectsResponse/parseListObjectsResponse";

/** One page (up to 1000) of a bucket's objects, in key order; pass the returned cursor for the next. */
export async function listObjects({ client, endpoint, bucket, cursor }: {
    client: AwsClient;
    endpoint: string;
    bucket: string;
    cursor?: string | null;
}): Promise<{ objects: ListedObject[]; nextCursor: string | null }> {
    const url = new URL(`${endpoint}/${bucket}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("max-keys", "1000");
    if (cursor) {
        url.searchParams.set("continuation-token", cursor);
    }
    const response = await client.fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Listing ${bucket} failed: ${response.status}`);
    }
    const xml = await response.text();
    return parseListObjectsResponse(xml);
}
