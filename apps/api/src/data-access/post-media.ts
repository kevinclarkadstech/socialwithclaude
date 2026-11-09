import { eq, inArray } from "drizzle-orm";
import type { PostMediaPlacement } from "@myapp/shared/domains";
import { schema, type Transaction } from "./db";

/**
 * Sets a post's photos, in order with their captions, and deletes the images
 * in `removedMediaIds` (their files are deleted by the mutation). Which
 * photos may go on the post was decided in shared.
 */
export async function placePostMedia(tx: Transaction, { postId, media, removedMediaIds }: {
    postId: string;
    media: PostMediaPlacement[];
    removedMediaIds: string[];
}) {
    if (removedMediaIds.length > 0) {
        // Deleting the images takes their links with them.
        await tx.delete(schema.media).where(inArray(schema.media.id, removedMediaIds));
    }
    for (const { id, caption, position } of media) {
        await tx
            .insert(schema.postMedia)
            .values({ postId, mediaId: id, caption, position })
            .onConflictDoUpdate({ target: [schema.postMedia.postId, schema.postMedia.mediaId], set: { caption, position } });
    }
}

/** Deletes a post's images (used when the post is deleted; their files are deleted by the mutation). */
export async function deletePostMedia(tx: Transaction, { postId }: { postId: string }) {
    const linked = await tx.select({ id: schema.postMedia.mediaId }).from(schema.postMedia).where(eq(schema.postMedia.postId, postId));
    if (linked.length > 0) {
        await tx.delete(schema.media).where(inArray(schema.media.id, linked.map((row) => row.id)));
    }
}
