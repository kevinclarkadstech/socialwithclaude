import type { AwsClient } from "aws4fetch";
import { mapWithConcurrency } from "@myapp/shared/utils";
import { deleteObject } from "../deleteObject/deleteObject";

// Deletes in flight at once: a sweep can delete a whole page (up to 1000), which shouldn't be one burst.
const CONCURRENCY = 10;

/**
 * Deletes objects, a few at a time. Every key is tried; if any fail, this
 * throws once at the end (an AggregateError of each failure), so one bad key
 * doesn't leave the rest behind.
 */
export async function deleteObjects({ client, endpoint, bucket, keys }: {
    client: AwsClient;
    endpoint: string;
    bucket: string;
    keys: string[];
}): Promise<void> {
    const results = await mapWithConcurrency({
        items: keys,
        limit: CONCURRENCY,
        run: (key) => deleteObject({ client, endpoint, bucket, key }),
    });
    const failures = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
    if (failures.length > 0) {
        throw new AggregateError(failures, `Deleting ${failures.length} of ${keys.length} objects from ${bucket} failed`);
    }
}
