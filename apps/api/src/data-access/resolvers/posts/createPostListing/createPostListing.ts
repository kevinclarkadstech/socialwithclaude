import { eq, sql } from "drizzle-orm";
import type { ListingCondition, ListingPrice, Post, PostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { selectPosts } from "../../../selects/selectPosts";
import { placePostMedia } from "../../../post-media";

export type CreatePostListingArgs = {
    id: string;
    userId: string;
    content: string;
    media: PostMedia[];
    title: string;
    description: string;
    condition: ListingCondition;
    isNegotiable: boolean;
} & ListingPrice;

/**
 * Creates a post with the client's `id`, its listing details and photos, and counts
 * it on the author's profile (as a post, and as a listing). Null if the id is already used.
 */
export async function createPostListing({ id, userId, content, media, ...listing }: CreatePostListingArgs): Promise<Post | null> {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(schema.posts)
            .values({ id, type: "listing", content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.posts.id })
            .returning();
        if (!post) {
            return null;
        }

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

        await placePostMedia(tx, { postId: id, media, removedMediaIds: [] });

        await tx
            .update(schema.userProfiles)
            .set({
                numPosts: sql`${schema.userProfiles.numPosts} + 1`,
                numListings: sql`${schema.userProfiles.numListings} + 1`,
            })
            .where(eq(schema.userProfiles.userId, userId));

        const [row] = await selectPosts(tx, userId).where(eq(schema.posts.id, id));
        return toPost(row!);
    });
}
