import type { ListingCondition, ListingPrice, Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";

export type CreatePostListingArgs = {
    id: string;
    userId: string;
    content: string;
    title: string;
    description: string;
    condition: ListingCondition;
    isNegotiable: boolean;
} & ListingPrice;

/** Creates a post with the client's `id`, and its listing details. Null if the id is already used. */
export async function createPostListing({ id, userId, content, ...listing }: CreatePostListingArgs): Promise<Post | null> {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(schema.posts)
            .values({ id, content, createdBy: userId, updatedBy: userId })
            .onConflictDoNothing({ target: schema.posts.id })
            .returning();
        if (!post) {
            return null;
        }

        const [listingRow] = await tx
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
            })
            .returning();
        return toPost(post, listingRow!);
    });
}
