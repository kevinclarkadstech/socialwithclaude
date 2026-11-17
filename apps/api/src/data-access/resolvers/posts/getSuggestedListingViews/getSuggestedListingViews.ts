import { and, desc, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import type { PostView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { findPostViews } from "../../../internal/posts/findPostViews/findPostViews";

/**
 * Available listings to suggest to `viewerId`: from people they follow
 * first, then everyone else's, newest first; none by `excludedCreatorIds`.
 * (To rank by popularity instead, order by num_comments + num_saves + num_shares.)
 */
export async function getSuggestedListingViews({ viewerId, excludedCreatorIds, limit }: {
    viewerId: string | null;
    excludedCreatorIds: string[];
    limit: number;
}): Promise<PostView[]> {
    return findPostViews({
        viewerId,
        where: and(
            isNotNull(schema.postListings.postId),
            isNull(schema.posts.deletedAt),
            eq(schema.postListings.status, "available"),
            excludedCreatorIds.length ? notInArray(schema.posts.createdBy, excludedCreatorIds) : undefined,
        ),
        // findPostViews joins the viewer's accepted follow of each creator: followed creators first.
        orderBy: [sql`${schema.userFollows.createdAt} is null`, desc(schema.postListings.createdAt), desc(schema.postListings.postId)],
        limit,
    });
}
