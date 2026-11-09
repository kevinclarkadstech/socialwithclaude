import { and, eq, inArray, sql } from "drizzle-orm";
import type { PostMedia } from "@myapp/shared/domains";
import { schema, type Transaction } from "./db";

/**
 * Saves a post's photos as the mutation built them: adds new ones, updates
 * the captions of those it has, and deletes `removedMediaIds` (their files
 * are deleted by the mutation). Which photos it gets was decided in shared.
 */
export async function placePostMedia(tx: Transaction, { postId, media, removedMediaIds }: {
    postId: string;
    media: PostMedia[];
    removedMediaIds: string[];
}) {
    if (removedMediaIds.length > 0) {
        await tx
            .delete(schema.postMedia)
            .where(and(eq(schema.postMedia.postId, postId), inArray(schema.postMedia.id, removedMediaIds)));
    }
    for (const photo of media) {
        await tx
            .insert(schema.postMedia)
            .values({ ...photo, createdAt: new Date(photo.createdAt), updatedAt: new Date(photo.updatedAt) })
            .onConflictDoUpdate({
                target: schema.postMedia.id,
                set: { caption: photo.caption, updatedBy: photo.updatedBy, updatedAt: new Date(photo.updatedAt) },
                // Only a photo of this post (an id can't move a photo between posts).
                setWhere: sql`${schema.postMedia.postId} = ${postId}`,
            });
    }
}

/** Deletes a post's photo rows (when the post is deleted; the mutation deletes their files). */
export async function deletePostMedia(tx: Transaction, { postId }: { postId: string }) {
    await tx.delete(schema.postMedia).where(eq(schema.postMedia.postId, postId));
}
