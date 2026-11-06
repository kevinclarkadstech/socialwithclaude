import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { ListingStatus, Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { toPage } from "../../../paging";
import { selectPosts } from "../../../selects/selectPosts";

/** Listings, newest first, as `viewerId` sees them; only those with `status` if given. */
export async function getPostListings({ status, viewerId, cursor, limit }: {
    status?: ListingStatus;
    viewerId: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Post>> {
    const rows = await selectPosts(db, viewerId)
        .where(and(
            isNotNull(schema.postListings.postId),
            isNull(schema.posts.deletedAt),
            status ? eq(schema.postListings.status, status) : undefined,
            cursor
                ? sql`(${schema.postListings.createdAt}, ${schema.postListings.postId}) < (select created_at, post_id from post_listings where post_id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.postListings.createdAt), desc(schema.postListings.postId))
        .limit(limit + 1);
    return toPage(rows.map(toPost), limit, (post) => post.id);
}
