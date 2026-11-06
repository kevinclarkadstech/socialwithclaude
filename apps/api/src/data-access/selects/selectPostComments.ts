import { and, eq, sql } from "drizzle-orm";
import { schema } from "../db";
import { creatorFields } from "./creatorFields";
import type { Executor } from "./executor";

/**
 * Comments with their creator, `viewerId`'s vote and whether they saved
 * them. Add where/orderBy/limit, then map rows with toPostComment.
 */
export function selectPostComments(executor: Executor, viewerId: string | null) {
    return executor
        .select({
            comment: schema.postComments,
            creator: creatorFields,
            vote: schema.postCommentVotes.value,
            savedAt: schema.userSaves.createdAt,
        })
        .from(schema.postComments)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.userId, schema.postComments.createdBy))
        .leftJoin(
            schema.postCommentVotes,
            viewerId
                ? and(
                    eq(schema.postCommentVotes.postCommentId, schema.postComments.id),
                    eq(schema.postCommentVotes.userId, viewerId),
                )
                : sql`false`,
        )
        .leftJoin(
            schema.userSaves,
            viewerId
                ? and(eq(schema.userSaves.postCommentId, schema.postComments.id), eq(schema.userSaves.userId, viewerId))
                : sql`false`,
        )
        .$dynamic();
}

export type SelectedPostCommentRow = Awaited<ReturnType<typeof selectPostComments>>[number];
