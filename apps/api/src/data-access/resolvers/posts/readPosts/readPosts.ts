import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { Post, PostMedia } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { creatorFields, toCreator } from "../../../creator";
import { toPostListing } from "../../../mappers/posts";

/**
 * Reads posts as `viewerId` sees them: each with its photos (in the order
 * they were added), listing details (if any), creator (and who can see their
 * posts), and whether the viewer saved it and follows its creator. Data only:
 * who can see a post is decided in shared (canViewPost).
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function readPosts({ executor = db, viewerId, where, orderBy = [], limit }: {
    executor?: Executor;
    viewerId: string | null;
    where?: SQL;
    orderBy?: (SQL | AnyPgColumn)[];
    limit?: number;
}): Promise<Post[]> {
    let query = selectPosts(executor, viewerId);
    if (where) {
        query = query.where(where);
    }
    if (orderBy.length > 0) {
        query = query.orderBy(...orderBy);
    }
    if (limit !== undefined) {
        query = query.limit(limit);
    }
    const rows = await query;
    return rows.map(toPost);
}

function selectPosts(executor: Executor, viewerId: string | null) {
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

type Row = Awaited<ReturnType<typeof selectPosts>>[number];

/** A post from selectPosts, with its listing details if it's a listing. */
function toPost({ post, listing, media, creator, creatorVisibility, savedAt, followedAt }: Row): Post {
    return {
        id: post.id,
        type: post.type,
        content: post.content,
        numSaves: post.numSaves,
        numComments: post.numComments,
        numShares: post.numShares,
        numReactions: post.numReactions,
        ...(listing && { listing: toPostListing(listing) }),
        media,
        // Sign-up creates settings with the profile; without them, treat the profile as followers-only.
        creator: { ...toCreator(creator), profileVisibility: creatorVisibility ?? "followers" },
        viewer: { hasSaved: savedAt !== null, followsCreator: followedAt !== null },
        createdBy: post.createdBy,
        updatedBy: post.updatedBy,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
    };
}
