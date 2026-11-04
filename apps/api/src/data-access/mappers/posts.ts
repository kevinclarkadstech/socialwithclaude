import type { Post, PostComment, PostCommentReport, PostCommentVote, PostListing, PostReport } from "@myapp/shared/domains";
import type { schema } from "../db";

type PostRow = typeof schema.posts.$inferSelect;
type PostListingRow = typeof schema.postListings.$inferSelect;
type PostCommentRow = typeof schema.postComments.$inferSelect;
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

/** A post, with its listing details if it's a listing. */
export function toPost(row: PostRow, listing: PostListingRow | null): Post {
    return {
        id: row.id,
        content: row.content,
        numSaves: row.numSaves,
        numComments: row.numComments,
        numShares: row.numShares,
        numReactions: row.numReactions,
        ...(listing && { listing: toPostListing(listing) }),
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export function toPostComment(row: PostCommentRow): PostComment {
    return {
        id: row.id,
        postId: row.postId,
        content: row.content,
        numUpVotes: row.numUpVotes,
        numDownVotes: row.numDownVotes,
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
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
