import { and, eq, isNull, sql } from "drizzle-orm";
import type { ListingCondition, ListingPrice, ListingStatus, Post, PostMedia } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { selectPosts } from "../../../selects/selectPosts";
import { syncPostMedia } from "../../../post-media";

export type UpdatePostListingArgs = {
    id: string;
    userId: string;
    content: string;
    media: PostMedia[];
    title: string;
    description: string;
    condition: ListingCondition;
    status: ListingStatus;
    isNegotiable: boolean;
} & ListingPrice;

/** Replaces a listing's content, details and photos, as `userId`. Null if it doesn't exist, was deleted or isn't a listing. */
export async function updatePostListing({ id, userId, content, media, ...listing }: UpdatePostListingArgs): Promise<Post | null> {
    return db.transaction(async (tx) => {
        const now = new Date();
        const [post] = await tx
            .update(schema.posts)
            .set({ content, updatedBy: userId, updatedAt: now })
            .where(and(
                eq(schema.posts.id, id),
                isNull(schema.posts.deletedAt),
                sql`exists (select 1 from post_listings where post_id = ${id})`,
            ))
            .returning();
        if (!post) {
            return null;
        }

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

        await syncPostMedia(tx, { postId: id, media });

        const [row] = await selectPosts(tx, userId).where(eq(schema.posts.id, id));
        return toPost(row!);
    });
}
