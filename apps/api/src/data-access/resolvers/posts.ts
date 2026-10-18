import { and, asc, desc, eq, exists, gt, ilike, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { schema, type Database } from "../db";
import {
    IdConflictError,
    CannotReportOwnCommentError,
    CannotReportOwnPostError,
    CommentNotFoundError,
    NotCommentAuthorError,
    NotPostAuthorError,
    PostNotFoundError,
} from "../errors";
import type { MediaRowInput } from "../../media";
import { replacePostMedia } from "./media";
import {
    authorFields,
    containsPattern,
    listingFields,
    postFields,
    postMediaSql,
    postNotDeleted,
    postThumbnailSql,
    toMediaDto,
} from "./shared";

const commentFields = {
    id: schema.postComments.id,
    body: schema.postComments.body,
    numUpvotes: schema.postComments.numUpvotes,
    numDownvotes: schema.postComments.numDownvotes,
    score: schema.postComments.score,
    createdAt: schema.postComments.createdAt,
    updatedAt: schema.postComments.updatedAt,
};

const notDeleted = postNotDeleted;
const commentNotDeleted = isNull(schema.postComments.deletedAt);

const cursorPost = alias(schema.posts, "cursor_post");

/**
 * Posts after the cursor post in newest-first order: (created_at, id) less
 * than the cursor's. The cursor stays an id; its created_at is looked up.
 */
function postsBefore(db: Database, cursor: string) {
    const cursorRow = db
        .select({ createdAt: cursorPost.createdAt, id: cursorPost.id })
        .from(cursorPost)
        .where(eq(cursorPost.id, cursor));
    return sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (${cursorRow})`;
}

/**
 * True when the comment's post exists and isn't deleted (comments on deleted
 * posts are hidden). Pass `postAuthorId` to also require that post author.
 */
function commentPostIsLive(db: Database, postAuthorId?: string) {
    return exists(
        db
            .select({ one: sql`1` })
            .from(schema.posts)
            .where(
                and(
                    eq(schema.posts.id, schema.postComments.postId),
                    notDeleted,
                    postAuthorId ? eq(schema.posts.createdBy, postAuthorId) : undefined,
                ),
            ),
    );
}

/**
 * Returns the post with its author, or null if it doesn't exist or was deleted.
 * `listing` holds the listing details when `kind` is "listing", else null.
 * `media` is the post's photos in order.
 * When `viewerId` is given, `isSaved` reports whether the viewer saved it.
 */
export async function getPostById(db: Database, postId: string, viewerId: string | null) {
    const [post] = await db
        .select({
            ...postFields,
            author: authorFields,
            listing: listingFields,
            media: postMediaSql,
            isSaved: sql<boolean>`${schema.postSaves.postId} is not null`,
        })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
        .leftJoin(schema.postListingDetails, eq(schema.postListingDetails.postId, schema.posts.id))
        .leftJoin(
            schema.postSaves,
            viewerId
                ? and(
                    eq(schema.postSaves.userId, viewerId),
                    eq(schema.postSaves.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);

    return post ? { ...post, media: post.media.map(toMediaDto) } : null;
}

/**
 * The Feed tab: regular posts (not listings), newest first by server time, with authors,
 * photos and `isSaved` for the viewer. Pass the previous page's `nextCursor`
 * as `cursor` to get the next page.
 */
export async function getFeed(
    db: Database,
    viewerId: string | null,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const rows = await db
        .select({
            ...postFields,
            author: authorFields,
            media: postMediaSql,
            isSaved: sql<boolean>`${schema.postSaves.postId} is not null`,
        })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
        .leftJoin(
            schema.postSaves,
            viewerId
                ? and(
                    eq(schema.postSaves.userId, viewerId),
                    eq(schema.postSaves.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(and(eq(schema.posts.kind, "post"), notDeleted, cursor ? postsBefore(db, cursor) : undefined))
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
        items: items.map((post) => ({ ...post, media: post.media.map(toMediaDto) })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
}

/**
 * Posts whose body (or, for listings, title) contains `query`
 * (case-insensitive), newest first, with authors, listing details and first
 * photo (`thumbnail`). `kind` limits it to posts or listings. Pass the
 * previous page's `nextCursor` as `cursor` to get the next page.
 */
export async function searchPosts(
    db: Database,
    query: string,
    { kind, cursor, limit }: { kind?: (typeof schema.postKinds)[number] | null; cursor?: string | null; limit: number },
) {
    const pattern = containsPattern(query);
    const rows = await db
        .select({
            ...postFields,
            author: authorFields,
            listing: listingFields,
            thumbnail: postThumbnailSql,
        })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
        .leftJoin(schema.postListingDetails, eq(schema.postListingDetails.postId, schema.posts.id))
        .where(
            and(
                notDeleted,
                kind ? eq(schema.posts.kind, kind) : undefined,
                or(ilike(schema.posts.body, pattern), ilike(schema.postListingDetails.title, pattern)),
                cursor ? postsBefore(db, cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.posts.createdAt), desc(schema.posts.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
        items: items.map(({ thumbnail, ...post }) => ({
            ...post,
            thumbnail: thumbnail && toMediaDto(thumbnail),
        })),
        nextCursor: hasMore ? items[items.length - 1]!.id : null,
    };
}

/**
 * Saves (bookmarks) a post for a user. Saving an already-saved post is a no-op.
 *
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 */
export async function savePost(db: Database, userId: string, postId: string) {
    const [post] = await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);
    if (!post) throw new PostNotFoundError(postId);

    await db.insert(schema.postSaves).values({ userId, postId }).onConflictDoNothing();
}

type ReportInput = { reason: (typeof schema.reportReasons)[number]; details: string | null };

/** The author of a live (not deleted) post, or null. */
export async function getPostAuthorId(db: Database, postId: string) {
    const [post] = await db
        .select({ authorId: schema.posts.createdBy })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);

    return post?.authorId ?? null;
}

/** The authors of a live comment and of its (live) post, or null. */
export async function getPostCommentAuthorIds(db: Database, commentId: string) {
    const [row] = await db
        .select({ authorId: schema.postComments.createdBy, postAuthorId: schema.posts.createdBy })
        .from(schema.postComments)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.postComments.postId))
        .where(and(eq(schema.postComments.id, commentId), commentNotDeleted, notDeleted))
        .limit(1);

    return row ?? null;
}

/**
 * Reports a post. Each user has one report per post: reporting again updates
 * the reason and details (status is left alone).
 *
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 * @throws CannotReportOwnPostError if `reporterId` wrote the post.
 */
export async function reportPost(
    db: Database,
    reporterId: string,
    postId: string,
    { reason, details }: ReportInput,
) {
    const [post] = await db
        .select({ authorId: schema.posts.createdBy })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);
    if (!post) throw new PostNotFoundError(postId);
    if (post.authorId === reporterId) throw new CannotReportOwnPostError(postId);

    await db
        .insert(schema.postReports)
        .values({ postId, reason, details, createdBy: reporterId, updatedBy: reporterId })
        .onConflictDoUpdate({
            target: [schema.postReports.createdBy, schema.postReports.postId],
            set: { reason, details, updatedBy: reporterId, updatedAt: new Date() },
        });
}

/** Removes a save. A no-op if it wasn't saved, and works even if the post was deleted. */
export async function unsavePost(db: Database, userId: string, postId: string) {
    await db
        .delete(schema.postSaves)
        .where(and(eq(schema.postSaves.userId, userId), eq(schema.postSaves.postId, postId)));
}

/**
 * Returns a page of the user's saved posts, most recently saved first, with
 * their authors and first photo (`thumbnail`). Deleted posts are skipped. Pass the previous page's
 * `nextCursor` as `cursor` to get the next page.
 */
export async function getSavedPosts(
    db: Database,
    userId: string,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const rows = await db
        .select({
            ...postFields,
            author: authorFields,
            listing: listingFields,
            thumbnail: postThumbnailSql,
            savedAt: schema.postSaves.createdAt,
            saveId: schema.postSaves.id,
        })
        .from(schema.postSaves)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.postSaves.postId))
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.createdBy))
        .leftJoin(schema.postListingDetails, eq(schema.postListingDetails.postId, schema.posts.id))
        .where(
            and(
                eq(schema.postSaves.userId, userId),
                notDeleted,
                cursor ? lt(schema.postSaves.id, cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.postSaves.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
        // `saveId` is each item's cursor position (the API layer strips it).
        items: page.map(({ thumbnail, ...post }) => ({
            ...post,
            thumbnail: thumbnail && toMediaDto(thumbnail),
        })),
        nextCursor: hasMore ? page[page.length - 1]!.saveId : null,
    };
}

export type CommentSort = "oldest" | "top";

const cursorComment = alias(schema.postComments, "cursor_comment");

/**
 * Returns a page of a post's comments with their authors and the viewer's
 * vote (`myVote`: 1, -1, or 0 when not voted or signed out).
 *
 * - "oldest": oldest first.
 * - "top": highest score first, oldest first among ties. Scores can change
 *   between pages, so a comment may occasionally repeat or be skipped.
 *
 * The cursor is always the last comment's id: pass the previous page's
 * `nextCursor` as `cursor`, with the same `sort`, to get the next page.
 *
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 */
export async function getPostComments(
    db: Database,
    postId: string,
    viewerId: string | null,
    { cursor, limit, sort }: { cursor?: string | null; limit: number; sort: CommentSort },
) {
    const [post] = await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);
    if (!post) throw new PostNotFoundError(postId);

    const { id, score } = schema.postComments;
    let after: SQL | undefined;
    if (cursor && sort === "top") {
        // Continue after the cursor comment's current score, breaking ties by id.
        // There's no score index: "top" sorts a post's comments in memory, which
        // is cheap at our comment volumes. Add (post_id, score DESC, id) if a
        // post's comments ever get large.
        const cursorScore = db
            .select({ score: cursorComment.score })
            .from(cursorComment)
            .where(eq(cursorComment.id, cursor));
        after = and(
            lte(score, sql`(${cursorScore})`),
            or(lt(score, sql`(${cursorScore})`), gt(id, cursor)),
        );
    } else if (cursor) {
        // Oldest first by server time; the cursor's created_at is looked up.
        const cursorRow = db
            .select({ createdAt: cursorComment.createdAt, id: cursorComment.id })
            .from(cursorComment)
            .where(eq(cursorComment.id, cursor));
        after = sql`(${schema.postComments.createdAt}, ${id}) > (${cursorRow})`;
    }

    const rows = await db
        .select({
            ...commentFields,
            author: authorFields,
            myVote: sql<number>`coalesce(${schema.postCommentVotes.value}, 0)`.mapWith(Number),
        })
        .from(schema.postComments)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.postComments.createdBy))
        .leftJoin(
            schema.postCommentVotes,
            viewerId
                ? and(
                    eq(schema.postCommentVotes.userId, viewerId),
                    eq(schema.postCommentVotes.commentId, schema.postComments.id),
                )
                : sql`false`,
        )
        .where(and(eq(schema.postComments.postId, postId), commentNotDeleted, after))
        .orderBy(
            ...(sort === "top"
                ? [desc(score), asc(id)]
                : [asc(schema.postComments.createdAt), asc(id)]),
        )
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}

/**
 * Sets the user's vote on a comment: 1 (up), -1 (down) or 0 (remove), and
 * adjusts the comment's vote counts in the same transaction. Setting the vote
 * the user already has is a no-op, so retries are safe. Users may vote on
 * their own comments.
 *
 * @throws CommentNotFoundError if the comment or its post doesn't exist or was deleted.
 */
export async function voteOnPostComment(
    db: Database,
    userId: string,
    commentId: string,
    value: -1 | 0 | 1,
) {
    await db.transaction(async (tx) => {
        // Lock the comment row so concurrent votes by the same user can't
        // both count; the counter update below would lock it anyway.
        const [comment] = await tx
            .select({ id: schema.postComments.id })
            .from(schema.postComments)
            .where(and(eq(schema.postComments.id, commentId), commentNotDeleted, commentPostIsLive(db)))
            .limit(1)
            .for("update");
        if (!comment) throw new CommentNotFoundError(commentId);

        const voteKey = and(
            eq(schema.postCommentVotes.userId, userId),
            eq(schema.postCommentVotes.commentId, commentId),
        );
        const [existing] = await tx
            .select({ value: schema.postCommentVotes.value })
            .from(schema.postCommentVotes)
            .where(voteKey)
            .limit(1);
        const previous = existing?.value ?? 0;
        if (value === previous) return;

        if (value === 0) {
            await tx.delete(schema.postCommentVotes).where(voteKey);
        } else {
            await tx
                .insert(schema.postCommentVotes)
                .values({ userId, commentId, value })
                .onConflictDoUpdate({
                    target: [schema.postCommentVotes.userId, schema.postCommentVotes.commentId],
                    set: { value, updatedAt: new Date() },
                });
        }

        const upDelta = (value === 1 ? 1 : 0) - (previous === 1 ? 1 : 0);
        const downDelta = (value === -1 ? 1 : 0) - (previous === -1 ? 1 : 0);

        await tx
            .update(schema.postComments)
            .set({
                numUpvotes: sql`${schema.postComments.numUpvotes} + ${upDelta}`,
                numDownvotes: sql`${schema.postComments.numDownvotes} + ${downDelta}`,
            })
            .where(eq(schema.postComments.id, commentId));
    });
}

/**
 * Adds a comment and bumps the post's comment count in one transaction.
 *
 * `id` is client-generated (optional). Retrying with the same id succeeds
 * without adding or counting the comment again.
 *
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 * @throws IdConflictError if `id` belongs to another user's or another post's comment.
 */
export async function createPostComment(
    db: Database,
    authorId: string,
    postId: string,
    body: string,
    id?: string,
) {
    class AlreadyExists extends Error {}

    try {
        return await db.transaction(async (tx) => {
            const [post] = await tx
                .update(schema.posts)
                .set({ numComments: sql`${schema.posts.numComments} + 1` })
                .where(and(eq(schema.posts.id, postId), notDeleted))
                .returning({ id: schema.posts.id });
            if (!post) throw new PostNotFoundError(postId);

            const [comment] = await tx
                .insert(schema.postComments)
                .values({ id, postId, body, createdBy: authorId, updatedBy: authorId })
                .onConflictDoNothing({ target: schema.postComments.id })
                .returning({ id: schema.postComments.id });
            // Roll back the count bump; a retry is checked below.
            if (!comment) throw new AlreadyExists();
        });
    } catch (err) {
        if (!(err instanceof AlreadyExists)) throw err;

        const [existing] = await db
            .select({ authorId: schema.postComments.createdBy, postId: schema.postComments.postId })
            .from(schema.postComments)
            .where(eq(schema.postComments.id, id!));
        if (!existing || existing.authorId !== authorId || existing.postId !== postId) {
            throw new IdConflictError(id!);
        }
    }
}

/**
 * Reports a comment. Each user has one report per comment: reporting again
 * updates the reason and details (status is left alone).
 *
 * @throws CommentNotFoundError if the comment or its post doesn't exist or was deleted.
 * @throws CannotReportOwnCommentError if `reporterId` wrote the comment.
 */
export async function reportPostComment(
    db: Database,
    reporterId: string,
    commentId: string,
    { reason, details }: ReportInput,
) {
    const [comment] = await db
        .select({ authorId: schema.postComments.createdBy })
        .from(schema.postComments)
        .where(
            and(eq(schema.postComments.id, commentId), commentNotDeleted, commentPostIsLive(db)),
        )
        .limit(1);
    if (!comment) throw new CommentNotFoundError(commentId);
    if (comment.authorId === reporterId) throw new CannotReportOwnCommentError(commentId);

    await db
        .insert(schema.postCommentReports)
        .values({ commentId, reason, details, createdBy: reporterId, updatedBy: reporterId })
        .onConflictDoUpdate({
            target: [schema.postCommentReports.createdBy, schema.postCommentReports.commentId],
            set: { reason, details, updatedBy: reporterId, updatedAt: new Date() },
        });
}

/**
 * Edits a comment. Only the comment's author may edit it.
 *
 * @throws CommentNotFoundError if the comment or its post doesn't exist or was deleted.
 * @throws NotCommentAuthorError if `userId` didn't write the comment.
 */
export async function updatePostComment(db: Database, userId: string, commentId: string, body: string) {
    const [comment] = await db
        .update(schema.postComments)
        .set({ body, updatedBy: userId, updatedAt: new Date() })
        .where(
            and(
                eq(schema.postComments.id, commentId),
                eq(schema.postComments.createdBy, userId),
                commentNotDeleted,
                commentPostIsLive(db),
            ),
        )
        .returning({ id: schema.postComments.id });

    if (!comment) await throwWhyCommentNotWritable(db, userId, commentId);
}

/**
 * Soft-deletes a comment and lowers the post's comment count in one
 * transaction. The comment's author or the post's author may delete it.
 * Deleting a comment that's already gone (or whose post is) succeeds, so
 * retried deletes are safe.
 *
 * @throws CommentNotFoundError if the comment doesn't exist.
 * @throws NotCommentAuthorError if `userId` wrote neither the comment nor the post.
 */
export async function deletePostComment(db: Database, userId: string, commentId: string) {
    const deleted = await db.transaction(async (tx) => {
        const [comment] = await tx
            .update(schema.postComments)
            .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
            .where(
                and(
                    eq(schema.postComments.id, commentId),
                    commentNotDeleted,
                    commentPostIsLive(db),
                    or(eq(schema.postComments.createdBy, userId), commentPostIsLive(db, userId)),
                ),
            )
            .returning({ postId: schema.postComments.postId });
        if (!comment) return false;

        await tx
            .update(schema.posts)
            .set({ numComments: sql`${schema.posts.numComments} - 1` })
            .where(eq(schema.posts.id, comment.postId));
        return true;
    });

    if (deleted) return;

    // Already deleted (or its post was) by someone allowed to delete it: done.
    const [gone] = await db
        .select({
            authorId: schema.postComments.createdBy,
            deletedAt: schema.postComments.deletedAt,
            postAuthorId: schema.posts.createdBy,
            postDeletedAt: schema.posts.deletedAt,
        })
        .from(schema.postComments)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.postComments.postId))
        .where(eq(schema.postComments.id, commentId));
    if (
        gone &&
        (gone.deletedAt || gone.postDeletedAt) &&
        (gone.authorId === userId || gone.postAuthorId === userId)
    ) {
        return;
    }
    await throwWhyCommentNotWritable(db, userId, commentId);
}

/** Called after a guarded comment write matched no rows, to report the right reason. */
async function throwWhyCommentNotWritable(db: Database, userId: string, commentId: string): Promise<never> {
    const [comment] = await db
        .select({ id: schema.postComments.id })
        .from(schema.postComments)
        .where(and(eq(schema.postComments.id, commentId), commentNotDeleted, commentPostIsLive(db)))
        .limit(1);

    if (!comment) throw new CommentNotFoundError(commentId);
    throw new NotCommentAuthorError(commentId, userId);
}

/**
 * Creates a post with its photos (already validated and moved by withMedia).
 * `id` is client-generated (optional).
 *
 * @throws IdConflictError if `id` is already used (the API layer checks
 *   isOwnPostId first, so this means a concurrent retry or another user).
 */
export async function createPost(
    db: Database,
    authorId: string,
    body: string,
    media: MediaRowInput[],
    id?: string,
) {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(schema.posts)
            .values({ id, body, createdBy: authorId, updatedBy: authorId })
            .onConflictDoNothing({ target: schema.posts.id })
            .returning({ id: schema.posts.id });
        if (!post) throw new IdConflictError(id!);

        await replacePostMedia(tx, post.id, media);
    });
}

/**
 * For retried creates: true if `authorId` already created a post of kind
 * `kind` with this id, false if the id is unused.
 *
 * @throws IdConflictError if the id belongs to someone else or another kind.
 */
export async function isOwnPostId(
    db: Database,
    id: string,
    authorId: string,
    kind: "post" | "listing",
) {
    const [post] = await db
        .select({ authorId: schema.posts.createdBy, kind: schema.posts.kind })
        .from(schema.posts)
        .where(eq(schema.posts.id, id));
    if (!post) return false;
    if (post.authorId !== authorId || post.kind !== kind) throw new IdConflictError(id);
    return true;
}

/**
 * Updates the body and, when `media` is given, replaces the photos.
 *
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 * @throws NotPostAuthorError if `userId` didn't write the post.
 */
export async function updatePost(
    db: Database,
    userId: string,
    postId: string,
    body: string,
    media?: MediaRowInput[],
) {
    const updated = await db.transaction(async (tx) => {
        const [post] = await tx
            .update(schema.posts)
            .set({ body, updatedBy: userId, updatedAt: new Date() })
            .where(and(eq(schema.posts.id, postId), eq(schema.posts.createdBy, userId), notDeleted))
            .returning({ id: schema.posts.id });
        if (!post) return false;

        if (media) await replacePostMedia(tx, postId, media);
        return true;
    });
    if (!updated) await throwWhyPostNotWritable(db, userId, postId);
}

/**
 * Soft-deletes a post; it and its comments stop appearing in queries.
 * Deleting your own already-deleted post succeeds, so retried deletes are safe.
 *
 * @throws PostNotFoundError if the post doesn't exist.
 * @throws NotPostAuthorError if `userId` didn't write the post.
 */
export async function deletePost(db: Database, userId: string, postId: string) {
    const [post] = await db
        .update(schema.posts)
        .set({ deletedAt: new Date(), updatedBy: userId, updatedAt: new Date() })
        .where(and(eq(schema.posts.id, postId), eq(schema.posts.createdBy, userId), notDeleted))
        .returning({ id: schema.posts.id });
    if (post) return;

    const [gone] = await db
        .select({ authorId: schema.posts.createdBy, deletedAt: schema.posts.deletedAt })
        .from(schema.posts)
        .where(eq(schema.posts.id, postId));
    if (gone?.deletedAt && gone.authorId === userId) return;

    await throwWhyPostNotWritable(db, userId, postId);
}

/** Called after a guarded write matched no rows, to report the right reason. */
async function throwWhyPostNotWritable(db: Database, userId: string, postId: string): Promise<never> {
    const [post] = await db
        .select({ authorId: schema.posts.createdBy })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);

    if (!post) throw new PostNotFoundError(postId);
    throw new NotPostAuthorError(postId, userId);
}
