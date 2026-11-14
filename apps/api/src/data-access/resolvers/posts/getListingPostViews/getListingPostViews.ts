import { and, desc, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import type { Page } from "@myapp/shared/types";
import type { ListingStatus, PostView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { toPage } from "../../../utils/toPage/toPage";
import { findPostViews } from "../../../internal/posts/findPostViews/findPostViews";

/** Listings, newest first, as `viewerId` sees them; only those with `status` if given. */
export async function getListingPostViews({ excludedCreatorIds = [], status, viewerId, cursor, limit }: {
    // Creators whose posts are left out.
    excludedCreatorIds?: string[];
    status?: ListingStatus;
    viewerId: string | null;
    cursor?: string | null;
    limit: number;
}): Promise<Page<PostView>> {
    const posts = await findPostViews({
        viewerId,
        where: and(
            isNotNull(schema.postListings.postId),
            isNull(schema.posts.deletedAt),
            excludedCreatorIds.length ? notInArray(schema.posts.createdBy, excludedCreatorIds) : undefined,
            status ? eq(schema.postListings.status, status) : undefined,
            cursor
                ? sql`(${schema.postListings.createdAt}, ${schema.postListings.postId}) < (select created_at, post_id from post_listings where post_id = ${cursor})`
                : undefined,
        ),
        orderBy: [desc(schema.postListings.createdAt), desc(schema.postListings.postId)],
        limit: limit + 1,
    });
    return toPage(posts, limit, (post) => post.id);
}
