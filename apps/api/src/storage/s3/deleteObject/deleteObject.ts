import type { AwsClient } from "aws4fetch";
import { generateObjectUrl } from "../generateObjectUrl/generateObjectUrl";

/** Deletes one object; one that's already gone counts as deleted. */
export async function deleteObject({ client, endpoint, bucket, key }: { client: AwsClient; endpoint: string; bucket: string; key: string }): Promise<void> {
    const response = await client.fetch(generateObjectUrl({ endpoint, bucket, key }).toString(), { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
        throw new Error(`Deleting ${bucket}/${key} failed: ${response.status}`);
    }
}
