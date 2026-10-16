import { and, desc, eq, exists, lt, sql } from "drizzle-orm";

import { schema, type Database } from "../db";
import { ListingNotFoundError, NotPostAuthorError } from "../errors";
import { authorFields, listingFields, postFields, postNotDeleted } from "./shared";

type ListingStatus = (typeof schema.listingStatuses)[number];

export type ListingDetails = {
    title: string;
    priceType: (typeof schema.listingPriceTypes)[number];
    /** Required for "fixed" / "negotiable"; null for "free" / "multiple". */
    priceCents: number | null;
    condition: (typeof schema.listingConditions)[number] | null;
    location: string | null;
};

const isListingPost = eq(schema.posts.kind, "listing");

/** Creates a post of kind "listing" and its details in one transaction. */
export async function createListing(
    db: Database,
    authorId: string,
    { body, ...details }: ListingDetails & { body: string },
) {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(schema.posts)
            .values({ authorId, body, kind: "listing" })
            .returning(postFields);

        const [listing] = await tx
            .insert(schema.listings)
            .values({ postId: post!.id, ...details })
            .returning(listingFields);

        return { ...post!, listing: listing! };
    });
}

/**
 * Replaces a listing's description (the post body) and details. Status is
 * changed separately with setListingStatus.
 *
 * @throws ListingNotFoundError if the listing doesn't exist or was deleted.
 * @throws NotPostAuthorError if `userId` didn't create the listing.
 */
export async function updateListing(
    db: Database,
    userId: string,
    postId: string,
    { body, ...details }: ListingDetails & { body: string },
) {
    const result = await db.transaction(async (tx) => {
        const now = new Date();
        const [post] = await tx
            .update(schema.posts)
            .set({ body, updatedAt: now })
            .where(
                and(
                    eq(schema.posts.id, postId),
                    eq(schema.posts.authorId, userId),
                    isListingPost,
                    postNotDeleted,
                ),
            )
            .returning(postFields);
        if (!post) return null;

        const [listing] = await tx
            .update(schema.listings)
            .set({ ...details, updatedAt: now })
            .where(eq(schema.listings.postId, postId))
            .returning(listingFields);

        return { ...post, listing: listing! };
    });

    return result ?? throwWhyListingNotWritable(db, userId, postId);
}

/**
 * @throws ListingNotFoundError if the listing doesn't exist or was deleted.
 * @throws NotPostAuthorError if `userId` didn't create the listing.
 */
export async function setListingStatus(
    db: Database,
    userId: string,
    postId: string,
    status: ListingStatus,
) {
    const [listing] = await db
        .update(schema.listings)
        .set({ status, updatedAt: new Date() })
        .where(
            and(
                eq(schema.listings.postId, postId),
                exists(
                    db
                        .select({ one: sql`1` })
                        .from(schema.posts)
                        .where(
                            and(
                                eq(schema.posts.id, schema.listings.postId),
                                eq(schema.posts.authorId, userId),
                                postNotDeleted,
                            ),
                        ),
                ),
            ),
        )
        .returning(listingFields);

    return listing ?? throwWhyListingNotWritable(db, userId, postId);
}

/**
 * Marketplace feed: listings newest first, optionally filtered by status, with
 * authors and `isSaved` for the viewer. Deleted listings are skipped. Pass the
 * previous page's `nextCursor` as `cursor` to get the next page.
 */
export async function getListings(
    db: Database,
    viewerId: string | null,
    { status, cursor, limit }: { status?: ListingStatus | null; cursor?: string | null; limit: number },
) {
    const rows = await db
        .select({
            ...postFields,
            author: authorFields,
            listing: listingFields,
            isSaved: sql<boolean>`${schema.savedPosts.postId} is not null`,
        })
        .from(schema.listings)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.listings.postId))
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.authorId))
        .leftJoin(
            schema.savedPosts,
            viewerId
                ? and(
                    eq(schema.savedPosts.userId, viewerId),
                    eq(schema.savedPosts.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(
            and(
                postNotDeleted,
                status ? eq(schema.listings.status, status) : undefined,
                cursor ? lt(schema.listings.postId, cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.listings.postId))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}

/** Called after a guarded listing write matched no rows, to report the right reason. */
async function throwWhyListingNotWritable(db: Database, userId: string, postId: string): Promise<never> {
    const [post] = await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), isListingPost, postNotDeleted))
        .limit(1);

    if (!post) throw new ListingNotFoundError(postId);
    throw new NotPostAuthorError(postId, userId);
}
