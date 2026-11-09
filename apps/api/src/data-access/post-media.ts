import { and, eq, inArray } from "drizzle-orm";
import type { PostMediaPlacement } from "@myapp/shared/domains";
import { schema, type Transaction } from "./db";

/**
 * Puts photos on a post, in order with their captions, and takes
 * `removedMediaIds` off it (deleting their rows; their files are deleted by
 * the mutation). Which photos may go on the post was decided in shared.
 */
export async function placePostMedia(tx: Transaction, { postId, userId, media, removedMediaIds }: {
    postId: string;
    userId: string;
    media: PostMediaPlacement[];
    removedMediaIds: string[];
}) {
    if (removedMediaIds.length > 0) {
        await tx
            .delete(schema.postMedia)
            .where(and(eq(schema.postMedia.postId, postId), inArray(schema.postMedia.id, removedMediaIds)));
    }
    const now = new Date();
    for (const { id, caption, position } of media) {
        await tx
            .update(schema.postMedia)
            .set({ postId, caption, position, updatedBy: userId, updatedAt: now })
            .where(eq(schema.postMedia.id, id));
    }
}
