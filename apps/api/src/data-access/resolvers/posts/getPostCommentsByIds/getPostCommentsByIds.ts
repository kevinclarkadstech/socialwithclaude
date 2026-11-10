import { and, inArray, isNull } from "drizzle-orm";
import type { PostComment } from "@myapp/shared/domains";
import { schema } from "../../../db";
import { readPostComments } from "../readPostComments/readPostComments";

/** The comments with these ids, as `viewerId` sees them, in no particular order. Deleted ones are left out. */
export async function getPostCommentsByIds({ ids, viewerId }: { ids: string[]; viewerId: string | null }): Promise<PostComment[]> {
    if (ids.length === 0) {
        return [];
    }
    return readPostComments({ viewerId, where: and(inArray(schema.postComments.id, ids), isNull(schema.postComments.deletedAt)) });
}
