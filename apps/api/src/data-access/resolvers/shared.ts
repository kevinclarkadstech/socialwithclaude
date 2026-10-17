import { isNull, sql } from "drizzle-orm";

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
