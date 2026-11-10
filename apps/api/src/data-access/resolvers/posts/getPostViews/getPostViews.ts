import { and, desc, eq, isNull, notInArray, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { PostView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { toPage } from "../../../paging";
import { findPostViews } from "../findPostViews/findPostViews";

/**
 * Posts and listings, newest first, as `viewerId` sees them; only
 * `createdBy`'s if given, and only listings (or only non-listings) if `isListing` is given.
 */
export async function getPostViews({ excludedCreatorIds = [], createdBy, isListing, viewerId, cursor, limit }: {
    // Creators whose posts are left out.
    excludedCreatorIds?: string[];
    createdBy?: string;
    isListing?: boolean;
    viewerId: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<PostView>> {
    const posts = await findPostViews({
        viewerId,
        where: and(
            isNull(schema.posts.deletedAt),
            excludedCreatorIds.length ? notInArray(schema.posts.createdBy, excludedCreatorIds) : undefined,
            createdBy ? eq(schema.posts.createdBy, createdBy) : undefined,
            isListing === undefined ? undefined : eq(schema.posts.type, isListing ? "listing" : "post"),
            cursor
                ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (select created_at, id from posts where id = ${cursor})`
                : undefined,
        ),
        orderBy: [desc(schema.posts.createdAt), desc(schema.posts.id)],
        limit: limit + 1,
    });
    return toPage(posts, limit, (post) => post.id);
}
