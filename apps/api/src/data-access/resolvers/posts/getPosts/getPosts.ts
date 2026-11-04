import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { toPage } from "../../../paging";

/** Posts and listings, newest first; only `createdBy`'s if given. */
export async function getPosts({ createdBy, cursor, limit }: {
    createdBy?: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Post>> {
    const rows = await db
        .select({ post: schema.posts, listing: schema.postListings })
        .from(schema.posts)
        .leftJoin(schema.postListings, eq(schema.postListings.postId, schema.posts.id))
        .where(and(
            isNull(schema.posts.deletedAt),
            createdBy ? eq(schema.posts.createdBy, createdBy) : undefined,
            cursor
                ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (select created_at, id from posts where id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);
    return toPage(rows.map((row) => toPost(row.post, row.listing)), limit, (post) => post.id);
}
