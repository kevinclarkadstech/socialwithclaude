import { and, eq, isNull } from "drizzle-orm";
import type { PostMedia, PostView, UpdatePostMutationInput } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getPostViewById } from "../getPostViewById/getPostViewById";
import { syncPostMedia } from "../syncPostMedia/syncPostMedia";

/**
 * Changes a post's content, as `userId`, makes its photos exactly `media`,
 * and replaces its listing details if `listing` is given (only for a listing:
 * that was checked in shared). Null if it doesn't exist or was deleted.
 */
export async function updatePost({ id, userId, content, media, listing }: {
    id: string;
    userId: string;
    content: string;
    media: PostMedia[];
    listing?: UpdatePostMutationInput["listing"];
}): Promise<PostView | null> {
    return db.transaction(async (tx) => {
        const now = new Date();
        const [updated] = await tx
            .update(schema.posts)
            .set({ content, updatedBy: userId, updatedAt: now })
            .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)))
            .returning({ id: schema.posts.id });
        if (!updated) {
            return null;
        }

        if (listing) {
            await tx
                .update(schema.postListings)
                .set({
                    title: listing.title,
                    description: listing.description,
                    condition: listing.condition,
                    status: listing.status,
                    isNegotiable: listing.isNegotiable,
                    priceType: listing.type,
                    priceCents: listing.type === "fixed" ? listing.priceCents : null,
                    updatedAt: now,
                })
                .where(eq(schema.postListings.postId, id));
        }

        await syncPostMedia(tx, { postId: id, media });

        // Just written, so it exists.
        return (await getPostViewById({ id, viewerId: userId }, tx))!;
    });
}
