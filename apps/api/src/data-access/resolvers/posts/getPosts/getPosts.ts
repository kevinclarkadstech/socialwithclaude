import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { toPage } from "../../../paging";
import { postVisibleTo } from "../../../selects/postVisibility";
import { selectPosts } from "../../../selects/selectPosts";

/**
 * Posts and listings, newest first, as `viewerId` sees them; only
 * `createdBy`'s if given, and only listings (or only non-listings) if `isListing` is given.
 */
export async function getPosts({ createdBy, isListing, viewerId, cursor, limit }: {
    createdBy?: string;
    isListing?: boolean;
    viewerId: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Post>> {
    const rows = await selectPosts(db, viewerId)
        .where(and(
            isNull(schema.posts.deletedAt),
            postVisibleTo(viewerId),
            createdBy ? eq(schema.posts.createdBy, createdBy) : undefined,
            isListing === undefined
                ? undefined
                : isListing ? isNotNull(schema.postListings.postId) : isNull(schema.postListings.postId),
            cursor
                ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (select created_at, id from posts where id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);
    return toPage(rows.map(toPost), limit, (post) => post.id);
}
