import { and, inArray, isNull } from "drizzle-orm";
import type { PostView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { findPostViews } from "../../../internal/posts/findPostViews/findPostViews";

/** The posts with these ids, as `viewerId` sees them, in no particular order. Deleted ones are left out. */
export async function getPostViewsByIds({ ids, viewerId }: { ids: string[]; viewerId: string | null }): Promise<PostView[]> {
    if (ids.length === 0) {
        return [];
    }
    return findPostViews({ viewerId, where: and(inArray(schema.posts.id, ids), isNull(schema.posts.deletedAt)) });
}
