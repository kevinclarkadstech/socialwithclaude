import { eq, sql } from "drizzle-orm";
import type { CreatePostMutationInput, PostMedia, PostView } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { getPostViewById } from "../getPostViewById/getPostViewById";
import { syncPostMedia } from "../syncPostMedia/syncPostMedia";

/**
 * Creates a post with the client's `id`, with its photos and, for a listing,
 * its listing details, and counts it on the author's profile (as a post, and
 * as a listing). Null if the id is already used.
 */
export async function createPost({ id, userId, content, media, listing }: {
    id: string;
    userId: string;
    content: string;
    media: PostMedia[];
    listing?: CreatePostMutationInput["listing"];
}): Promise<PostView | null> {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(schema.posts)
            .values({ id, type: listing ? "listing" : "post", content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.posts.id })
            .returning();
        if (!post) {
            return null;
        }

        if (listing) {
            await tx
                .insert(schema.postListings)
                .values({
                    postId: id,
                    title: listing.title,
                    description: listing.description,
                    condition: listing.condition,
                    isNegotiable: listing.isNegotiable,
                    priceType: listing.type,
                    priceCents: listing.type === "fixed" ? listing.priceCents : null,
                    createdAt: post.createdAt,
                });
        }

        await syncPostMedia(tx, { postId: id, media });

        await tx
            .update(schema.userProfiles)
            .set({
                numPosts: sql`${schema.userProfiles.numPosts} + 1`,
                ...(listing && { numListings: sql`${schema.userProfiles.numListings} + 1` }),
            })
            .where(eq(schema.userProfiles.userId, userId));

        // Just written, so it exists.
        return (await getPostViewById({ id, viewerId: userId }, tx))!;
    });
}
