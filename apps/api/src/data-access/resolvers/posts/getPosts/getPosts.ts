import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/common";
import type { Post } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { toPost } from "../../../mappers/posts";
import { toPage } from "../../../paging";
import { selectPosts } from "../../../selects/selectPosts";

/** Posts and listings, newest first, as `viewerId` sees them; only `createdBy`'s if given. */
export async function getPosts({ createdBy, viewerId, cursor, limit }: {
    createdBy?: string;
    viewerId: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<Post>> {
    const rows = await selectPosts(db, viewerId)
        .where(and(
            isNull(schema.posts.deletedAt),
            createdBy ? eq(schema.posts.createdBy, createdBy) : undefined,
            cursor
                ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (select created_at, id from posts where id = ${cursor})`
                : undefined,
        ))
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);
    return toPage(rows.map(toPost), limit, (post) => post.id);
}
