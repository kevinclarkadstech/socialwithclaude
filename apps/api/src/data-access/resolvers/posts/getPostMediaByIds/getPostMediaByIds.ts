import { inArray } from "drizzle-orm";
import type { UploadedPostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toUploadedPostMedia } from "../../../mappers/posts";

/** The photos with these ids that exist (uploaded for posts, on one or not), in no particular order. */
export async function getPostMediaByIds({ ids }: { ids: string[] }): Promise<UploadedPostMedia[]> {
    if (ids.length === 0) {
        return [];
    }
    const rows = await db.select().from(schema.postMedia).where(inArray(schema.postMedia.id, ids));
    return rows.map(toUploadedPostMedia);
}
