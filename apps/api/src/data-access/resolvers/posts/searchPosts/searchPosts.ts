import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { toPage } from "../../../paging";

/** Posts whose content (or listing title) contains `query`, case-insensitive, newest first. */
export async function searchPosts({ query, cursor, limit }: {
    query: string;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Post>> {
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const rows = await db
        .select({ post: schema.posts, listing: schema.postListings })
        .from(schema.posts)
        .leftJoin(schema.postListings, eq(schema.postListings.postId, schema.posts.id))
        .where(and(
            isNull(schema.posts.deletedAt),
            or(ilike(schema.posts.content, pattern), ilike(schema.postListings.title, pattern)),
            cursor
                ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (select created_at, id from posts where id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);
    return toPage(rows.map((row) => toPost(row.post, row.listing)), limit, (post) => post.id);
}
