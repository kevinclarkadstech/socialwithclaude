import { and, desc, eq, exists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { schema, type Database } from "../db";
import { IdConflictError, ListingNotFoundError, NotPostAuthorError } from "../errors";
import type { MediaRowInput } from "../../media";
import { replacePostMedia } from "./media";
import {
    authorFields,
    listingFields,
    postFields,
    postMediaSql,
    postNotDeleted,
    postThumbnailSql,
    toMediaDto,
} from "./shared";

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

const cursorListing = alias(schema.postListingDetails, "cursor_listing");

/** Listings after the cursor listing in newest-first (server time) order. */
function listingsBefore(db: Database, cursor: string) {
    const cursorRow = db
        .select({ createdAt: cursorListing.createdAt, postId: cursorListing.postId })
        .from(cursorListing)
        .where(eq(cursorListing.postId, cursor));
    return sql`(${schema.postListingDetails.createdAt}, ${schema.postListingDetails.postId}) < (${cursorRow})`;
}

/**
 * Creates a post of kind "listing" with its details and photos in one
 * transaction. `id` is client-generated (optional).
 *
 * @throws IdConflictError if `id` is already used (the API layer checks
 *   isOwnPostId first, so this means a concurrent retry or another user).
 */
export async function createListing(
    db: Database,
    authorId: string,
    { body, ...details }: ListingDetails & { body: string },
    media: MediaRowInput[],
    id?: string,
) {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(schema.posts)
            .values({ id, authorId, body, kind: "listing" })
            .onConflictDoNothing({ target: schema.posts.id })
            .returning({ id: schema.posts.id, createdAt: schema.posts.createdAt });
        if (!post) throw new IdConflictError(id!);

        await tx
            .insert(schema.postListingDetails)
            .values({ postId: post.id, createdAt: post.createdAt, ...details });
        await replacePostMedia(tx, post.id, media);
    });
}

/**
 * Replaces a listing's description (the post body) and details, and its photos
 * when `media` is given. Status is changed separately with setListingStatus.
 *
 * @throws ListingNotFoundError if the listing doesn't exist or was deleted.
 * @throws NotPostAuthorError if `userId` didn't create the listing.
 */
export async function updateListing(
    db: Database,
    userId: string,
    postId: string,
    { body, ...details }: ListingDetails & { body: string },
    media?: MediaRowInput[],
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
            .update(schema.postListingDetails)
            .set({ ...details, updatedAt: now })
            .where(eq(schema.postListingDetails.postId, postId))
            .returning(listingFields);

        return {
            ...post,
            listing: listing!,
            media: media ? await replacePostMedia(tx, postId, media) : null,
        };
    });
    if (!result) return throwWhyListingNotWritable(db, userId, postId);

    // Photos unchanged: read them back so the response shape is the same.
    if (!result.media) {
        const [current] = await db
            .select({ media: postMediaSql })
            .from(schema.posts)
            .where(eq(schema.posts.id, postId));
        return { ...result, media: current!.media.map(toMediaDto) };
    }
    return { ...result, media: result.media };
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
        .update(schema.postListingDetails)
        .set({ status, updatedAt: new Date() })
        .where(
            and(
                eq(schema.postListingDetails.postId, postId),
                exists(
                    db
                        .select({ one: sql`1` })
                        .from(schema.posts)
                        .where(
                            and(
                                eq(schema.posts.id, schema.postListingDetails.postId),
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
 * authors, first photo (`thumbnail`) and `isSaved` for the viewer. Deleted listings are skipped. Pass the
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
            thumbnail: postThumbnailSql,
            isSaved: sql<boolean>`${schema.postSaves.postId} is not null`,
        })
        .from(schema.postListingDetails)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.postListingDetails.postId))
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.authorId))
        .leftJoin(
            schema.postSaves,
            viewerId
                ? and(
                    eq(schema.postSaves.userId, viewerId),
                    eq(schema.postSaves.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(
            and(
                postNotDeleted,
                status ? eq(schema.postListingDetails.status, status) : undefined,
                cursor ? listingsBefore(db, cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.postListingDetails.createdAt), desc(schema.postListingDetails.postId))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
        items: items.map(({ thumbnail, ...item }) => ({
            ...item,
            thumbnail: thumbnail && toMediaDto(thumbnail),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
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
