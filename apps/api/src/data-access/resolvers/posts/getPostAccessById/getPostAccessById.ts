import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostAccess } from "@myapp/shared/domains";
import { db, schema } from "../../../db";
import { isAvailable } from "../../../internal/users/isAvailable/isAvailable";

/**
 * Who can see a post, as `viewerId`: its creator, whether their profile is
 * public, and whether the viewer follows them (accepted). One small query,
 * for checks on what's under a post (its comments) that don't show the post
 * itself; null if there's no such post, it was deleted, or its creator is unavailable (see isAvailable).
 */
export async function getPostAccessById({ id, viewerId }: { id: string; viewerId: string | null }): Promise<PostAccess | null> {
    const [row] = await db
        .select({
            id: schema.posts.id,
            createdBy: schema.posts.createdBy,
            profileVisibility: schema.userSettings.profileVisibility,
            followedAt: schema.userFollows.createdAt,
        })
        .from(schema.posts)
        .leftJoin(schema.userSettings, eq(schema.userSettings.userId, schema.posts.createdBy))
        .leftJoin(
            schema.userFollows,
            // Signed out: nobody is followed.
            viewerId
                ? and(
                    eq(schema.userFollows.followingId, schema.posts.createdBy),
                    eq(schema.userFollows.followerId, viewerId),
                    eq(schema.userFollows.status, "accepted"),
                )
                : sql`false`,
        )
        .where(and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt), isAvailable(schema.posts.createdBy)));
    if (!row) {
        return null;
    }
    return {
        id: row.id,
        createdBy: row.createdBy,
        // Sign-up creates settings with the profile; without them, treat the profile as followers-only (as findPostViews does).
        creator: { profileVisibility: row.profileVisibility ?? "followers" },
        viewer: { followsCreator: row.followedAt !== null },
    };
}
