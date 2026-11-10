import { and, inArray, isNull } from "drizzle-orm";
import type { PostCommentView } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { findPostCommentViews } from "../findPostCommentViews/findPostCommentViews";

/** The comments with these ids, as `viewerId` sees them, in no particular order. Deleted ones are left out. */
export async function getPostCommentViewsByIds({ ids, viewerId }: { ids: string[]; viewerId: string | null }): Promise<PostCommentView[]> {
    if (ids.length === 0) {
        return [];
    }
    return findPostCommentViews({ viewerId, where: and(inArray(schema.postComments.id, ids), isNull(schema.postComments.deletedAt)) });
}
