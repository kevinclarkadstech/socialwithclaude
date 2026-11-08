import { and, eq, or, sql, type SQL } from "drizzle-orm";
import { schema } from "../db";

/**
 * Posts `viewerId` may see, wherever posts are listed or opened (the feed,
 * the marketplace, search, a post's page), matching the shared
 * canViewUserPosts check: everyone's on a public profile; on a
 * followers-only one, only approved followers' (and the author's own);
 * never across a block, either way. Null viewerId: signed out.
 */
export function postVisibleTo(viewerId: string | null): SQL {
    const creator = schema.posts.createdBy;
    const isPublic = sql`exists (
        select 1 from ${schema.userSettings}
        where ${schema.userSettings.userId} = ${creator} and ${schema.userSettings.profileVisibility} = 'public'
    )`;
    if (!viewerId) {
        return isPublic;
    }
    const followsCreator = sql`exists (
        select 1 from ${schema.userFollows}
        where ${schema.userFollows.followerId} = ${viewerId}
          and ${schema.userFollows.followingId} = ${creator}
          and ${schema.userFollows.status} = 'accepted'
    )`;
    const blockedEitherWay = sql`exists (
        select 1 from ${schema.userBlocks}
        where (${schema.userBlocks.userId} = ${viewerId} and ${schema.userBlocks.blockedUserId} = ${creator})
           or (${schema.userBlocks.userId} = ${creator} and ${schema.userBlocks.blockedUserId} = ${viewerId})
    )`;
    return and(
        or(eq(creator, viewerId), isPublic, followsCreator),
        sql`not ${blockedEitherWay}`,
    )!;
}
