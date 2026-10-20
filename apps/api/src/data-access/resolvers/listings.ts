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
            .values({ id, body, kind: "listing", createdBy: authorId, updatedBy: authorId })
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
 * The text and details it replaces are kept in post_edits. Saving the same
 * values (and no photos) again is a no-op, so retries are safe.
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
    const updated = await db.transaction(async (tx) => {
        // Lock it so concurrent edits each record the values they replaced.
        const [current] = await tx
            .select({
                body: schema.posts.body,
                listing: {
                    title: schema.postListingDetails.title,
                    priceType: schema.postListingDetails.priceType,
                    priceCents: schema.postListingDetails.priceCents,
                    condition: schema.postListingDetails.condition,
                    location: schema.postListingDetails.location,
                },
            })
            .from(schema.posts)
            .innerJoin(schema.postListingDetails, eq(schema.postListingDetails.postId, schema.posts.id))
            .where(
                and(
                    eq(schema.posts.id, postId),
                    eq(schema.posts.createdBy, userId),
                    isListingPost,
                    postNotDeleted,
                ),
            )
            .for("update");
        if (!current) return false;

        const textChanged =
            current.body !== body ||
            (Object.keys(details) as (keyof ListingDetails)[]).some(
                (key) => current.listing[key] !== details[key],
            );
        // Nothing to change (e.g. a retry): leave it, so it isn't marked edited.
        if (!textChanged && !media) return true;

        if (textChanged) {
            await tx.insert(schema.postEdits).values({
                postId,
                previousBody: current.body,
                previousListing: current.listing,
                createdBy: userId,
                updatedBy: userId,
            });
        }
        const now = new Date();
        await tx
            .update(schema.posts)
            .set({ body, updatedBy: userId, updatedAt: now })
            .where(eq(schema.posts.id, postId));
        await tx
            .update(schema.postListingDetails)
            .set({ ...details, updatedAt: now })
            .where(eq(schema.postListingDetails.postId, postId));

        if (media) await replacePostMedia(tx, postId, media);
        return true;
    });
    if (!updated) await throwWhyListingNotWritable(db, userId, postId);
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
                                eq(schema.posts.createdBy, userId),
                                postNotDeleted,
                            ),
                        ),
                ),
            ),
        )
        .returning({ postId: schema.postListingDetails.postId });

    if (!listing) await throwWhyListingNotWritable(db, userId, postId);
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
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
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
