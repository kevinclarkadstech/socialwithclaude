import type { Post } from "@myapp/shared/domains/posts/types/post";
import { db, schema } from "../../../db";
import { postFields } from "../../shared";
import { eq, and, sql } from "drizzle-orm";

export async function fetchFeed(): Promise<{ items: Post[], nextCursor: string | null }> {
    const rows = await db
        .select({
            ...postFields,
            author: authorFields,
            media: postMediaSql,
            isSaved: sql<boolean>`${schema.postSaves.postId} is not null`,
        })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
        .leftJoin(
            schema.postSaves,
            viewerId
                ? and(
                    eq(schema.postSaves.userId, viewerId),
                    eq(schema.postSaves.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(
            and(
                eq(schema.posts.kind, "post"),
                notDeleted,
                postVisibleTo(viewerId),
                authorId ? eq(schema.posts.createdBy, authorId) : undefined,
                cursor ? postsBefore(db, cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
        items: items.map((post) => ({ ...post, media: post.media.map(toMediaDto) })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
}