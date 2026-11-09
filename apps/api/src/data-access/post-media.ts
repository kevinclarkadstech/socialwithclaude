import { and, eq, inArray, sql } from "drizzle-orm";
import type { PostMediaRow } from "@myapp/shared/domains";
import { schema, type Transaction } from "./db";

/**
 * Sets a post's photos as `userId`: adds new ones, updates the order and
 * captions of those it has, and deletes `removedMediaIds` (their files are
 * deleted by the mutation). Which photos it gets was decided in shared.
 */
export async function placePostMedia(tx: Transaction, { postId, userId, media, removedMediaIds }: {
    postId: string;
    userId: string;
    media: PostMediaRow[];
    removedMediaIds: string[];
}) {
    if (removedMediaIds.length > 0) {
        await tx
            .delete(schema.postMedia)
            .where(and(eq(schema.postMedia.postId, postId), inArray(schema.postMedia.id, removedMediaIds)));
    }
    for (const row of media) {
        await tx
            .insert(schema.postMedia)
            .values({ ...row, postId, createdBy: userId, updatedBy: userId })
            .onConflictDoUpdate({
                target: schema.postMedia.id,
                set: { position: row.position, caption: row.caption, updatedBy: userId, updatedAt: new Date() },
                // Only a photo of this post (an id can't move a photo between posts).
                setWhere: sql`${schema.postMedia.postId} = ${postId}`,
            });
    }
}

/** Deletes a post's photo rows (when the post is deleted; the mutation deletes their files). */
export async function deletePostMedia(tx: Transaction, { postId }: { postId: string }) {
    await tx.delete(schema.postMedia).where(eq(schema.postMedia.postId, postId));
}
