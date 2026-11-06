import { and, eq, sql } from "drizzle-orm";
import { schema } from "../db";
import { creatorFields } from "./creatorFields";
import type { Executor } from "./executor";

/**
 * Posts with their listing details (if any), creator, and whether
 * `viewerId` saved them. Add where/orderBy/limit, then map rows with toPost.
 */
export function selectPosts(executor: Executor, viewerId: string | null) {
    return executor
        .select({
            post: schema.posts,
            listing: schema.postListings,
            creator: creatorFields,
            savedAt: schema.userSaves.createdAt,
        })
        .from(schema.posts)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.posts.createdBy))
        .leftJoin(schema.postListings, eq(schema.postListings.postId, schema.posts.id))
        .leftJoin(
            schema.userSaves,
            viewerId
                ? and(eq(schema.userSaves.postId, schema.posts.id), eq(schema.userSaves.userId, viewerId))
                : sql`false`,
        )
        .$dynamic();
}

export type SelectedPostRow = Awaited<ReturnType<typeof selectPosts>>[number];
