import { and, desc, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { toPage } from "../../../paging";
import { selectPosts } from "../../../selects/selectPosts";

/** Posts whose content (or listing title) contains `query`, case-insensitive, newest first. */
export async function searchPosts({ excludeCreatorIds = [], query, viewerId, cursor, limit }: {
    // Creators whose posts are left out.
    excludeCreatorIds?: string[];
    query: string;
    viewerId: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Post>> {
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const rows = await selectPosts(db, viewerId)
        .where(and(
            isNull(schema.posts.deletedAt),
            excludeCreatorIds.length ? notInArray(schema.posts.createdBy, excludeCreatorIds) : undefined,
            or(ilike(schema.posts.content, pattern), ilike(schema.postListings.title, pattern)),
            cursor
                ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (select created_at, id from posts where id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);
    return toPage(rows.map(toPost), limit, (post) => post.id);
}
