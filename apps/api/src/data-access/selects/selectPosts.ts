import { and, eq, sql } from "drizzle-orm";
import type { PostMedia } from "@myapp/shared/domains";
import { schema } from "../db";
import { creatorFields } from "./creatorFields";
import type { Executor } from "./executor";

/**
 * Posts with their photos (in the order they were added), their listing details (if any), creator (and who may see their
 * posts), whether `viewerId` saved them, and whether `viewerId` is an approved
 * follower of the creator. Data only: deciding who may see a post is
 * canViewPost's job, in shared. Add where/orderBy/limit, then map rows with toPost.
 */
export function selectPosts(executor: Executor, viewerId: string | null) {
    return executor
        .select({
            post: schema.posts,
            listing: schema.postListings,
            media: sql<PostMedia[]>`coalesce((
                select json_agg(json_build_object(
                    'id', m.id, 'postId', m.post_id, 'caption', m.caption,
                    'width', m.width, 'height', m.height, 'placeholder', m.placeholder,
                    'createdBy', m.created_by, 'updatedBy', m.updated_by,
                    'createdAt', to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                    'updatedAt', to_char(m.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                ) order by m.id)
                from ${schema.postMedia} m
                where m.post_id = ${schema.posts.id}
            ), '[]'::json)`,
            creator: creatorFields,
            creatorVisibility: schema.userSettings.profileVisibility,
            savedAt: schema.userSaves.createdAt,
            followedAt: schema.userFollows.createdAt,
        })
        .from(schema.posts)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.posts.createdBy))
        .leftJoin(schema.userSettings, eq(schema.userSettings.userId, schema.posts.createdBy))
        .leftJoin(schema.postListings, eq(schema.postListings.postId, schema.posts.id))
        .leftJoin(
            schema.userFollows,
            viewerId
                ? and(
                    eq(schema.userFollows.followingId, schema.posts.createdBy),
                    eq(schema.userFollows.followerId, viewerId),
                    eq(schema.userFollows.status, "accepted"),
                )
                : sql`false`,
        )
        .leftJoin(
            schema.userSaves,
            viewerId
                ? and(eq(schema.userSaves.postId, schema.posts.id), eq(schema.userSaves.userId, viewerId))
                : sql`false`,
        )
        .$dynamic();
}

export type SelectedPostRow = Awaited<ReturnType<typeof selectPosts>>[number];
