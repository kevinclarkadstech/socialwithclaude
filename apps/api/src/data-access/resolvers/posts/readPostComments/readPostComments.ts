import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { PostComment } from "@myapp/shared/domains";
import { db, schema, type Executor } from "../../../db";
import { creatorFields, toCreator } from "../../../creator";

/**
 * Reads comments as `viewerId` sees them: each with its creator, the
 * viewer's vote and whether they saved it.
 * Private to these resolvers: everything else goes through the resolvers.
 */
export async function readPostComments({ executor = db, viewerId, where, orderBy = [], limit }: {
    executor?: Executor;
    viewerId: string | null;
    where?: SQL;
    orderBy?: (SQL | AnyPgColumn)[];
    limit?: number;
}): Promise<PostComment[]> {
    let query = selectPostComments(executor, viewerId);
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
    return rows.map(toPostComment);
}

function selectPostComments(executor: Executor, viewerId: string | null) {
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

type Row = Awaited<ReturnType<typeof selectPostComments>>[number];

/** A comment from selectPostComments. */
function toPostComment({ comment, creator, vote, savedAt }: Row): PostComment {
    return {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        numUpVotes: comment.numUpVotes,
        numDownVotes: comment.numDownVotes,
        creator: toCreator(creator),
        viewer: { hasSaved: savedAt !== null, vote: vote === null ? null : vote === 1 ? 1 : -1 },
        createdBy: comment.createdBy,
        updatedBy: comment.updatedBy,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
    };
}
