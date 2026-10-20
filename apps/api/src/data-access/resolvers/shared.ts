import { isNull, sql, type SQL } from "drizzle-orm";

import { mediaUrl } from "../../media";
import { schema } from "../db";

/** Select shapes and conditions shared by the post and listing resolvers. */

export const authorFields = {
    userId: schema.profiles.userId,
    username: schema.profiles.username,
    firstName: schema.profiles.firstName,
    lastName: schema.profiles.lastName,
    avatarUrl: schema.profiles.avatarUrl,
};

export const postFields = {
    id: schema.posts.id,
    kind: schema.posts.kind,
    body: schema.posts.body,
    numComments: schema.posts.numComments,
    numSaves: schema.posts.numSaves,
    createdAt: schema.posts.createdAt,
    updatedAt: schema.posts.updatedAt,
};

/** Select after a LEFT JOIN on listings; Drizzle returns null when there's no row. */
export const listingFields = {
    title: schema.postListingDetails.title,
    priceType: schema.postListingDetails.priceType,
    priceCents: schema.postListingDetails.priceCents,
    condition: schema.postListingDetails.condition,
    status: schema.postListingDetails.status,
    location: schema.postListingDetails.location,
    updatedAt: schema.postListingDetails.updatedAt,
};

export const postNotDeleted = isNull(schema.posts.deletedAt);

/**
 * True when `viewerId` may see the post: it's theirs, its author's profile is
 * public, or they're an accepted follower of its author. Signed out (null),
 * only posts by public profiles. Applies to listings too (they're posts).
 *
 * Correlated on "posts" by name (see postMediaSql for why), so it also works
 * inside subqueries over posts.
 */
export function postVisibleTo(viewerId: string | null): SQL {
    // A missing settings row means the defaults, which are public.
    const authorIsPublic = sql`not exists (
        select 1 from "user_settings"
        where "user_settings"."user_id" = "posts"."created_by"
            and "user_settings"."profile_visibility" = 'followers'
    )`;
    if (!viewerId) return authorIsPublic;
    return sql`("posts"."created_by" = ${viewerId} or ${authorIsPublic} or exists (
        select 1 from "user_follows"
        where "user_follows"."follower_id" = ${viewerId}
            and "user_follows"."following_id" = "posts"."created_by"
            and "user_follows"."status" = 'accepted'
    ))`;
}

/** Escapes LIKE wildcards so user input matches literally. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/** ILIKE pattern: text that starts with `query`. */
export const startsWithPattern = (query: string) => `${escapeLike(query)}%`;

/** ILIKE pattern: text that contains `query`. */
export const containsPattern = (query: string) => `%${escapeLike(query)}%`;

type MediaJson = {
    id: string;
    key: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    altText: string | null;
};

export type MediaDto = MediaJson & { url: string };

// Written with explicit table-qualified names: Drizzle drops the qualifier when
// the outer query reads a single table, which inside these correlated
// subqueries would make "id" resolve to post_media.id instead of posts.id.
const mediaJsonObject = sql.raw(`json_build_object(
    'id', "post_media"."id",
    'key', "post_media"."storage_key",
    'mimeType', "post_media"."mime_type",
    'width', "post_media"."width",
    'height', "post_media"."height",
    'altText', "post_media"."alt_text"
)`);

/** All of the post's photos in order (correlated on posts.id). */
export const postMediaSql = sql<MediaJson[]>`coalesce((
    select json_agg(${mediaJsonObject} order by "post_media"."position")
    from "post_media"
    where "post_media"."post_id" = "posts"."id"
), '[]'::json)`;

/** The post's first photo, or null (correlated on posts.id). */
export const postThumbnailSql = sql<MediaJson | null>`(
    select ${mediaJsonObject}
    from "post_media"
    where "post_media"."post_id" = "posts"."id"
    order by "post_media"."position"
    limit 1
)`;

export function toMediaDto(media: MediaJson): MediaDto {
    return { ...media, url: mediaUrl(media.key) };
}

/** Maps inserted or selected media rows to the shape reads return. */
export function rowToMediaDto(row: typeof schema.postMedia.$inferSelect): MediaDto {
    return toMediaDto({
        id: row.id,
        key: row.storageKey,
        mimeType: row.mimeType,
        width: row.width,
        height: row.height,
        altText: row.altText,
    });
}
