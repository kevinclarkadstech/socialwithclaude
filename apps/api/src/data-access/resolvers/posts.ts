import { and, asc, desc, eq, exists, gt, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { schema, type Database } from "../db";
import {
    CommentNotFoundError,
    NotCommentAuthorError,
    NotPostAuthorError,
    PostNotFoundError,
} from "../errors";
import type { MediaRowInput } from "../../media";
import { replacePostMedia } from "./media";
import {
    authorFields,
    listingFields,
    postFields,
    postMediaSql,
    postNotDeleted,
    postThumbnailSql,
    toMediaDto,
} from "./shared";

const commentFields = {
    id: schema.comments.id,
    body: schema.comments.body,
    numUpvotes: schema.comments.numUpvotes,
    numDownvotes: schema.comments.numDownvotes,
    score: schema.comments.score,
    createdAt: schema.comments.createdAt,
    updatedAt: schema.comments.updatedAt,
};

const notDeleted = postNotDeleted;
const commentNotDeleted = isNull(schema.comments.deletedAt);

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
                    eq(schema.posts.id, schema.comments.postId),
                    notDeleted,
                    postAuthorId ? eq(schema.posts.authorId, postAuthorId) : undefined,
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
            isSaved: sql<boolean>`${schema.savedPosts.postId} is not null`,
        })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.authorId))
        .leftJoin(schema.listings, eq(schema.listings.postId, schema.posts.id))
        .leftJoin(
            schema.savedPosts,
            viewerId
                ? and(
                    eq(schema.savedPosts.userId, viewerId),
                    eq(schema.savedPosts.postId, schema.posts.id),
                )
                : sql`false`,
        )
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);

    return post ? { ...post, media: post.media.map(toMediaDto) } : null;
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

    await db.insert(schema.savedPosts).values({ userId, postId }).onConflictDoNothing();
}

/** Removes a save. A no-op if it wasn't saved, and works even if the post was deleted. */
export async function unsavePost(db: Database, userId: string, postId: string) {
    await db
        .delete(schema.savedPosts)
        .where(and(eq(schema.savedPosts.userId, userId), eq(schema.savedPosts.postId, postId)));
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
            savedAt: schema.savedPosts.createdAt,
            saveId: schema.savedPosts.id,
        })
        .from(schema.savedPosts)
        .innerJoin(schema.posts, eq(schema.posts.id, schema.savedPosts.postId))
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.authorId))
        .leftJoin(schema.listings, eq(schema.listings.postId, schema.posts.id))
        .where(
            and(
                eq(schema.savedPosts.userId, userId),
                notDeleted,
                cursor ? lt(schema.savedPosts.id, cursor) : undefined,
            ),
        )
        .orderBy(desc(schema.savedPosts.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
        items: page.map(({ saveId: _, thumbnail, ...post }) => ({
            ...post,
            thumbnail: thumbnail && toMediaDto(thumbnail),
        })),
        nextCursor: hasMore ? page[page.length - 1]!.saveId : null,
    };
}

export type CommentSort = "oldest" | "top";

const cursorComment = alias(schema.comments, "cursor_comment");

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

    const { id, score } = schema.comments;
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
        after = gt(id, cursor);
    }

    const rows = await db
        .select({
            ...commentFields,
            author: authorFields,
            myVote: sql<number>`coalesce(${schema.commentVotes.value}, 0)`.mapWith(Number),
        })
        .from(schema.comments)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.comments.authorId))
        .leftJoin(
            schema.commentVotes,
            viewerId
                ? and(
                    eq(schema.commentVotes.userId, viewerId),
                    eq(schema.commentVotes.commentId, schema.comments.id),
                )
                : sql`false`,
        )
        .where(and(eq(schema.comments.postId, postId), commentNotDeleted, after))
        .orderBy(...(sort === "top" ? [desc(score), asc(id)] : [asc(id)]))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
}

/**
 * Sets the user's vote on a comment: 1 (up), -1 (down) or 0 (remove), and
 * adjusts the comment's vote counts in the same transaction. Users may vote on
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
    return db.transaction(async (tx) => {
        // Lock the comment row so concurrent votes by the same user can't
        // both count; the counter update below would lock it anyway.
        const [comment] = await tx
            .select({ id: schema.comments.id })
            .from(schema.comments)
            .where(and(eq(schema.comments.id, commentId), commentNotDeleted, commentPostIsLive(db)))
            .limit(1)
            .for("update");
        if (!comment) throw new CommentNotFoundError(commentId);

        const voteKey = and(
            eq(schema.commentVotes.userId, userId),
            eq(schema.commentVotes.commentId, commentId),
        );
        const [existing] = await tx
            .select({ value: schema.commentVotes.value })
            .from(schema.commentVotes)
            .where(voteKey)
            .limit(1);
        const previous = existing?.value ?? 0;

        if (value === 0) {
            await tx.delete(schema.commentVotes).where(voteKey);
        } else if (value !== previous) {
            await tx
                .insert(schema.commentVotes)
                .values({ userId, commentId, value })
                .onConflictDoUpdate({
                    target: [schema.commentVotes.userId, schema.commentVotes.commentId],
                    set: { value, updatedAt: new Date() },
                });
        }

        const upDelta = (value === 1 ? 1 : 0) - (previous === 1 ? 1 : 0);
        const downDelta = (value === -1 ? 1 : 0) - (previous === -1 ? 1 : 0);

        const [counts] = await tx
            .update(schema.comments)
            .set({
                numUpvotes: sql`${schema.comments.numUpvotes} + ${upDelta}`,
                numDownvotes: sql`${schema.comments.numDownvotes} + ${downDelta}`,
            })
            .where(eq(schema.comments.id, commentId))
            .returning({
                numUpvotes: schema.comments.numUpvotes,
                numDownvotes: schema.comments.numDownvotes,
                score: schema.comments.score,
            });

        return { ...counts!, myVote: value };
    });
}

/**
 * Adds a comment and bumps the post's comment count in one transaction.
 *
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 */
export async function createPostComment(db: Database, authorId: string, postId: string, body: string) {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .update(schema.posts)
            .set({ numComments: sql`${schema.posts.numComments} + 1` })
            .where(and(eq(schema.posts.id, postId), notDeleted))
            .returning({ id: schema.posts.id });
        if (!post) throw new PostNotFoundError(postId);

        const [comment] = await tx
            .insert(schema.comments)
            .values({ postId, authorId, body })
            .returning(commentFields);

        return comment!;
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
        .update(schema.comments)
        .set({ body, updatedAt: new Date() })
        .where(
            and(
                eq(schema.comments.id, commentId),
                eq(schema.comments.authorId, userId),
                commentNotDeleted,
                commentPostIsLive(db),
            ),
        )
        .returning(commentFields);

    if (!comment) await throwWhyCommentNotWritable(db, userId, commentId);
    return comment!;
}

/**
 * Soft-deletes a comment and lowers the post's comment count in one
 * transaction. The comment's author or the post's author may delete it.
 *
 * @throws CommentNotFoundError if the comment or its post doesn't exist or was deleted.
 * @throws NotCommentAuthorError if `userId` wrote neither the comment nor the post.
 */
export async function deletePostComment(db: Database, userId: string, commentId: string) {
    const deleted = await db.transaction(async (tx) => {
        const [comment] = await tx
            .update(schema.comments)
            .set({ deletedAt: new Date() })
            .where(
                and(
                    eq(schema.comments.id, commentId),
                    commentNotDeleted,
                    commentPostIsLive(db),
                    or(eq(schema.comments.authorId, userId), commentPostIsLive(db, userId)),
                ),
            )
            .returning({ postId: schema.comments.postId });
        if (!comment) return false;

        await tx
            .update(schema.posts)
            .set({ numComments: sql`${schema.posts.numComments} - 1` })
            .where(eq(schema.posts.id, comment.postId));
        return true;
    });

    if (!deleted) await throwWhyCommentNotWritable(db, userId, commentId);
}

/** Called after a guarded comment write matched no rows, to report the right reason. */
async function throwWhyCommentNotWritable(db: Database, userId: string, commentId: string): Promise<never> {
    const [comment] = await db
        .select({ id: schema.comments.id })
        .from(schema.comments)
        .where(and(eq(schema.comments.id, commentId), commentNotDeleted, commentPostIsLive(db)))
        .limit(1);

    if (!comment) throw new CommentNotFoundError(commentId);
    throw new NotCommentAuthorError(commentId, userId);
}

/** Creates a post with its photos (already validated and moved by withMedia). */
export async function createPost(db: Database, authorId: string, body: string, media: MediaRowInput[]) {
    return db.transaction(async (tx) => {
        const [post] = await tx
            .insert(schema.posts)
            .values({ authorId, body })
            .returning(postFields);

        return { ...post!, media: await replacePostMedia(tx, post!.id, media) };
    });
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
    const result = await db.transaction(async (tx) => {
        const [post] = await tx
            .update(schema.posts)
            .set({ body, updatedAt: new Date() })
            .where(and(eq(schema.posts.id, postId), eq(schema.posts.authorId, userId), notDeleted))
            .returning(postFields);
        if (!post) return null;

        if (media) return { ...post, media: await replacePostMedia(tx, postId, media) };
        return { ...post, media: null };
    });
    if (!result) return throwWhyPostNotWritable(db, userId, postId);

    // Photos unchanged: read them back so the response shape is the same.
    if (!result.media) {
        const [current] = await db
            .select({ media: postMediaSql })
            .from(schema.posts)
            .where(eq(schema.posts.id, postId));
        return { ...result, media: current!.media.map(toMediaDto) };
    }
    return { ...result, media: result.media };
}

/**
 * Soft-deletes a post; it and its comments stop appearing in queries.
 *
 * @throws PostNotFoundError if the post doesn't exist or was already deleted.
 * @throws NotPostAuthorError if `userId` didn't write the post.
 */
export async function deletePost(db: Database, userId: string, postId: string) {
    const [post] = await db
        .update(schema.posts)
        .set({ deletedAt: new Date() })
        .where(and(eq(schema.posts.id, postId), eq(schema.posts.authorId, userId), notDeleted))
        .returning({ id: schema.posts.id });

    if (!post) await throwWhyPostNotWritable(db, userId, postId);
}

/** Called after a guarded write matched no rows, to report the right reason. */
async function throwWhyPostNotWritable(db: Database, userId: string, postId: string): Promise<never> {
    const [post] = await db
        .select({ authorId: schema.posts.authorId })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);

    if (!post) throw new PostNotFoundError(postId);
    throw new NotPostAuthorError(postId, userId);
}
