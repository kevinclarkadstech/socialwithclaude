import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/**
 * Which of these photos are on a post that hasn't been deleted, as
 * "postId/photoId": the rest are no longer used anywhere.
 */
export async function getLivePostMediaIds({ photoIds }: { photoIds: string[] }): Promise<Set<string>> {
    if (photoIds.length === 0) {
        return new Set();
    }
    const rows = await db
        .select({ id: schema.postMedia.id, postId: schema.postMedia.postId })
        .from(schema.postMedia)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.postMedia.postId))
        .where(and(inArray(schema.postMedia.id, photoIds), isNull(schema.posts.deletedAt)));
    return new Set(rows.map((row) => `${row.postId}/${row.id}`));
}
