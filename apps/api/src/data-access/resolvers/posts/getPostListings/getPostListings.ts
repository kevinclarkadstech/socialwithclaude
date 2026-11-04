import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { ListingStatus, Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { toPage } from "../../../paging";

/** Listings, newest first; only those with `status` if given. */
export async function getPostListings({ status, cursor, limit }: {
    status?: ListingStatus;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Post>> {
    const rows = await db
        .select({ post: schema.posts, listing: schema.postListings })
        .from(schema.postListings)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.postListings.postId))
        .where(and(
            isNull(schema.posts.deletedAt),
            status ? eq(schema.postListings.status, status) : undefined,
            cursor
                ? sql`(${schema.postListings.createdAt}, ${schema.postListings.postId}) < (select created_at, post_id from post_listings where post_id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.postListings.createdAt), desc(schema.postListings.postId))
        .limit(limit + 1);
    return toPage(rows.map((row) => toPost(row.post, row.listing)), limit, (post) => post.id);
}
