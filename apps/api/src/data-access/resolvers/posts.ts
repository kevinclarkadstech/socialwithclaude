import { and, asc, eq, exists, gt, isNull, or, sql } from "drizzle-orm";

import { schema, type Database } from "../db";
import {
    CommentNotFoundError,
    NotCommentAuthorError,
    NotPostAuthorError,
    PostNotFoundError,
} from "../errors";

const authorFields = {
    userId: schema.profiles.userId,
    username: schema.profiles.username,
    firstName: schema.profiles.firstName,
    lastName: schema.profiles.lastName,
    avatarUrl: schema.profiles.avatarUrl,
};

const postFields = {
    id: schema.posts.id,
    body: schema.posts.body,
    numComments: schema.posts.numComments,
    createdAt: schema.posts.createdAt,
    updatedAt: schema.posts.updatedAt,
};

const commentFields = {
    id: schema.comments.id,
    body: schema.comments.body,
    createdAt: schema.comments.createdAt,
    updatedAt: schema.comments.updatedAt,
};

const notDeleted = isNull(schema.posts.deletedAt);
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

/** Returns the post with its author, or null if it doesn't exist or was deleted. */
export async function getPostById(db: Database, postId: string) {
    const [post] = await db
        .select({ ...postFields, author: authorFields })
        .from(schema.posts)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.posts.authorId))
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);

    return post ?? null;
}

/**
 * Returns a page of a post's comments, oldest first, with their authors.
 * Pass the previous page's `nextCursor` as `cursor` to get the next page.
 *
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 */
export async function getPostComments(
    db: Database,
    postId: string,
    { cursor, limit }: { cursor?: string | null; limit: number },
) {
    const [post] = await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(and(eq(schema.posts.id, postId), notDeleted))
        .limit(1);
    if (!post) throw new PostNotFoundError(postId);

    const rows = await db
        .select({ ...commentFields, author: authorFields })
        .from(schema.comments)
        .innerJoin(schema.profiles, eq(schema.profiles.userId, schema.comments.authorId))
        .where(
            and(
                eq(schema.comments.postId, postId),
                commentNotDeleted,
                cursor ? gt(schema.comments.id, cursor) : undefined,
            ),
        )
        .orderBy(asc(schema.comments.id))
        .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
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

export async function createPost(db: Database, authorId: string, body: string) {
    const [post] = await db
        .insert(schema.posts)
        .values({ authorId, body })
        .returning(postFields);

    return post!;
}

/**
 * @throws PostNotFoundError if the post doesn't exist or was deleted.
 * @throws NotPostAuthorError if `userId` didn't write the post.
 */
export async function updatePost(db: Database, userId: string, postId: string, body: string) {
    const [post] = await db
        .update(schema.posts)
        .set({ body, updatedAt: new Date() })
        .where(and(eq(schema.posts.id, postId), eq(schema.posts.authorId, userId), notDeleted))
        .returning(postFields);

    if (!post) await throwWhyPostNotWritable(db, userId, postId);
    return post!;
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
