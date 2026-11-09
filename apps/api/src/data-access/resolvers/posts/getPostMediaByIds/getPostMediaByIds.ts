import { eq, inArray } from "drizzle-orm";
import type { UploadedPostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";

/** The uploaded images with these ids that exist, with who uploaded each and the post it's on (if any), in no particular order. */
export async function getPostMediaByIds({ ids }: { ids: string[] }): Promise<UploadedPostMedia[]> {
    if (ids.length === 0) {
        return [];
    }
    const rows = await db
        .select({ media: schema.media, postId: schema.postMedia.postId })
        .from(schema.media)
        .leftJoin(schema.postMedia, eq(schema.postMedia.mediaId, schema.media.id))
        .where(inArray(schema.media.id, ids));
    return rows.map(({ media, postId }) => ({
        id: media.id,
        path: media.path,
        width: media.width,
        height: media.height,
        placeholder: media.placeholder,
        createdBy: media.createdBy,
        postId,
    }));
}
