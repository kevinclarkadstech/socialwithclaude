import type { PostCommentVote } from "@myapp/shared/domains";

import type { PostCommentVoteRow } from "../../types";

export function toPostCommentVote(row: PostCommentVoteRow): PostCommentVote {
    return {
        userId: row.userId,
        postCommentId: row.postCommentId,
        value: row.value === 1 ? 1 : -1,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
