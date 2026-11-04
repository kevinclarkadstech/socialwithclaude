import { and, eq, isNull, sql } from "drizzle-orm";
import type { ListingCondition, ListingPrice, ListingStatus, Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";

export type UpdatePostListingArgs = {
    id: string;
    userId: string;
    content: string;
    title: string;
    description: string;
    condition: ListingCondition;
    status: ListingStatus;
    isNegotiable: boolean;
} & ListingPrice;

/** Replaces one of `userId`'s listings' content and details. Null if they have no such listing. */
export async function updatePostListing({ id, userId, content, ...listing }: UpdatePostListingArgs): Promise<Post | null> {
    return db.transaction(async (tx) => {
        const now = new Date();
        const [post] = await tx
            .update(schema.posts)
            .set({ content, updatedBy: userId, updatedAt: now })
            .where(and(
                eq(schema.posts.id, id),
                eq(schema.posts.createdBy, userId),
                isNull(schema.posts.deletedAt),
                sql`exists (select 1 from post_listings where post_id = ${id})`,
            ))
            .returning();
        if (!post) return null;

        const [listingRow] = await tx
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
            .where(eq(schema.postListings.postId, id))
            .returning();
        return toPost(post, listingRow!);
    });
}
