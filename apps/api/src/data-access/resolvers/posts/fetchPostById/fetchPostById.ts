import type { Post } from "@myapp/shared/domains/posts/types/post";
import { db, schema } from "../../../db";
import { postFields, postVisibleTo } from "../../shared";
import { eq, and, sql } from "drizzle-orm";

export async function fetchPostById({ id }: Pick<Post, 'id'>): Promise<Post | null> {
    const [post] = await db
        .select({
            ...postFields,
            isSaved: sql<boolean>`${schema.postSaves.postId} is not null`,
        })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
        .leftJoin(schema.postListingDetails, eq(schema.postListingDetails.postId, schema.posts.id))
        .leftJoin(
            schema.postSaves,
            viewerId
                ? and(
                    eq(schema.postSaves.userId, viewerId),
                    eq(schema.postSaves.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(and(eq(schema.posts.id, id), notDeleted, postVisibleTo(viewerId)))
        .limit(1);
    return null;
}