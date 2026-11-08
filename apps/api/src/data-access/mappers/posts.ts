import type { Post, PostComment, PostCommentReport, PostCommentVote, PostListing, PostReport } from "@myapp/shared/domains";
import type { schema } from "../db";
import type { SelectedPostRow } from "../selects/selectPosts";
import type { SelectedPostCommentRow } from "../selects/selectPostComments";

type PostListingRow = typeof schema.postListings.$inferSelect;
type PostCommentVoteRow = typeof schema.postCommentVotes.$inferSelect;
type PostReportRow = typeof schema.postReports.$inferSelect;
type PostCommentReportRow = typeof schema.postCommentReports.$inferSelect;

export function toPostListing(row: PostListingRow): PostListing {
    const fields = {
        postId: row.postId,
        title: row.title,
        description: row.description,
        condition: row.condition,
        status: row.status,
        isNegotiable: row.isNegotiable,
    };
    switch (row.priceType) {
        case "fixed":
            return { ...fields, type: "fixed", priceCents: row.priceCents! };
        case "free":
            return { ...fields, type: "free" };
        case "multiple":
            return { ...fields, type: "multiple" };
    }
}

/** A post from selectPosts, with its listing details if it's a listing. */
export function toPost({ post, listing, creator, creatorVisibility, savedAt, followedAt }: SelectedPostRow): Post {
    return {
        id: post.id,
        type: post.type,
        content: post.content,
        numSaves: post.numSaves,
        numComments: post.numComments,
        numShares: post.numShares,
        numReactions: post.numReactions,
        ...(listing && { listing: toPostListing(listing) }),
        // Sign-up creates settings with the profile; without them, treat the profile as followers-only.
        creator: { ...creator, profileVisibility: creatorVisibility ?? "followers" },
        viewer: { hasSaved: savedAt !== null, followsCreator: followedAt !== null },
        createdBy: post.createdBy,
        updatedBy: post.updatedBy,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
    };
}

/** A comment from selectPostComments. */
export function toPostComment({ comment, creator, vote, savedAt }: SelectedPostCommentRow): PostComment {
    return {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        numUpVotes: comment.numUpVotes,
        numDownVotes: comment.numDownVotes,
        creator,
        viewer: { hasSaved: savedAt !== null, vote: vote === null ? null : vote === 1 ? 1 : -1 },
        createdBy: comment.createdBy,
        updatedBy: comment.updatedBy,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
    };
}

export function toPostCommentVote(row: PostCommentVoteRow): PostCommentVote {
    return {
        userId: row.userId,
        postCommentId: row.postCommentId,
        value: row.value === 1 ? 1 : -1,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toPostReport(row: PostReportRow): PostReport {
    return {
        id: row.id,
        postId: row.postId,
        reason: row.reason,
        details: row.details,
        status: row.status,
        snapshot: row.snapshot,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toPostCommentReport(row: PostCommentReportRow): PostCommentReport {
    return {
        id: row.id,
        postCommentId: row.postCommentId,
        reason: row.reason,
        details: row.details,
        status: row.status,
        snapshot: row.snapshot,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
