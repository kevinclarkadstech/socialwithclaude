import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../../../db";

/**
 * Which of these photos are in use, as "parentId/photoId" (the folder their
 * files are in): on a post that hasn't been deleted, or on a comment that
 * hasn't been. The rest are no longer used anywhere.
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
    const commentPhotos = await db
        .select({ id: schema.postCommentPhotos.id, postCommentId: schema.postCommentPhotos.postCommentId })
        .from(schema.postCommentPhotos)
        .innerJoin(schema.postComments, eq(schema.postComments.id, schema.postCommentPhotos.postCommentId))
        .where(and(inArray(schema.postCommentPhotos.id, photoIds), isNull(schema.postComments.deletedAt)));
    return new Set([
        ...rows.map((row) => `${row.postId}/${row.id}`),
        ...commentPhotos.map((row) => `${row.postCommentId}/${row.id}`),
    ]);
}
