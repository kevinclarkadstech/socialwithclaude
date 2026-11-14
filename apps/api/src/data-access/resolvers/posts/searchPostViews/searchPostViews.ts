import { and, desc, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { PostView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { toPage } from "../../../utils/toPage/toPage";
import { findPostViews } from "../../../internal/posts/findPostViews/findPostViews";

/** Posts whose content (or listing title) contains `query`, case-insensitive, newest first. */
export async function searchPostViews({ excludedCreatorIds = [], query, viewerId, cursor, limit }: {
    // Creators whose posts are left out.
    excludedCreatorIds?: string[];
    query: string;
    viewerId: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<PostView>> {
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const posts = await findPostViews({
        viewerId,
        where: and(
            isNull(schema.posts.deletedAt),
            excludedCreatorIds.length ? notInArray(schema.posts.createdBy, excludedCreatorIds) : undefined,
            or(ilike(schema.posts.content, pattern), ilike(schema.postListings.title, pattern)),
            cursor
                ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (select created_at, id from posts where id = ${cursor})`
                : undefined,
        ),
        orderBy: [desc(schema.posts.createdAt), desc(schema.posts.id)],
        limit: limit + 1,
    });
    return toPage(posts, limit, (post) => post.id);
}
