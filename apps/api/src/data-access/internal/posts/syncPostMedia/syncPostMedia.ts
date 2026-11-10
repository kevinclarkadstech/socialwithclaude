import { and, eq, notInArray, sql } from "drizzle-orm";
import type { PostMedia } from "@myapp/shared/domains";
import { schema, type Transaction } from "../../../db";

/**
 * Makes a post's stored photos exactly `media`: adds new ones, updates the
 * captions of those it has, and deletes any it has that aren't in `media`
 * (the mutation deletes their files). Which photos are in `media` was
 * decided in shared.
 */
export async function syncPostMedia(tx: Transaction, { postId, media }: { postId: string; media: PostMedia[] }) {
    const keptIds = media.map((photo) => photo.id);
    await tx
        .delete(schema.postMedia)
        .where(and(
            eq(schema.postMedia.postId, postId),
            keptIds.length > 0 ? notInArray(schema.postMedia.id, keptIds) : undefined,
        ));
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
