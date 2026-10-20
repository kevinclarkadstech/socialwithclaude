import { z } from "zod";
import { commentBody, postBody } from "@myapp/shared/types/posts";
import { TRPCError } from "@trpc/server";

import {
    createPostComment,
    createPost,
    deletePost,
    deletePostComment,
    getFeed,
    getProfileByUsername,
    getUserSettings,
    getPostAuthorId,
    getPostById,
    getPostCommentAuthorIds,
    getPostComments,
    getPostMediaRows,
    isOwnPostId,
    getSavedPosts,
    reportPost,
    reportPostComment,
    savePost,
    searchPosts,
    unsavePost,
    updatePost,
    updatePostComment,
    voteOnPostComment,
} from "../../data-access";
import { withMedia } from "../../media";
import { fillVisiblePage, getUserBlockList, isBlocked } from "../blocking";
import { mediaContext, requireUserAndProfile, type TRPCContext } from "../context";
import { clientId, createOnce } from "../client-ids";
import { mediaInput, reportInput } from "../inputs";
import { procedure, router } from "../trpc";

const postIdInput = z.object({ id: z.string().min(1) });
const pageInput = z.object({
    cursor: z.string().nullish(),
    limit: z.number().int().min(1).max(100).default(20),
});

const postNotFound = () => new TRPCError({ code: "NOT_FOUND", message: "POST_NOT_FOUND" });
const commentNotFound = () => new TRPCError({ code: "NOT_FOUND", message: "COMMENT_NOT_FOUND" });

/**
 * POST_NOT_FOUND if the caller and the post's author have blocked each other.
 * A missing post is left for the data-access call to report.
 */
async function assertPostNotBlocked(ctx: TRPCContext, postId: string) {
    if (!ctx.user) return;
    const authorId = await getPostAuthorId(ctx.db, postId);
    if (authorId && isBlocked(await getUserBlockList(ctx), authorId)) throw postNotFound();
}

/** COMMENT_NOT_FOUND if the caller is blocked with the comment's or the post's author. */
async function assertCommentNotBlocked(ctx: TRPCContext, commentId: string) {
    if (!ctx.user) return;
    const authors = await getPostCommentAuthorIds(ctx.db, commentId);
    if (!authors) return;
    const blockList = await getUserBlockList(ctx);
    if (isBlocked(blockList, authors.authorId) || isBlocked(blockList, authors.postAuthorId)) {
        throw commentNotFound();
    }
}

/**
 * A page of posts or listings matching `query` that the caller can see:
 * authors blocked either way are left out. Pass `nextCursor` as `cursor`.
 */
export async function searchVisiblePosts(
    ctx: TRPCContext,
    query: string,
    { kind, ...page }: { kind: "post" | "listing"; cursor?: string | null; limit: number },
) {
    const blockList = await getUserBlockList(ctx);
    return fillVisiblePage(
        (cursor, limit) =>
            searchPosts(ctx.db, query, { kind, cursor, limit, viewerId: ctx.user?.id ?? null }),
        page,
        (p) => !isBlocked(blockList, p.author.userId),
        (p) => p.id,
    );
}

export const postsRouter = router({
    getPostById: procedure.input(postIdInput).query(async ({ ctx, input }) => {
        const post = await getPostById(ctx.db, input.id, ctx.user?.id ?? null);
        if (!post || isBlocked(await getUserBlockList(ctx), post.author.userId)) throw postNotFound();

        return post;
    }),

    /** The Feed tab: regular posts (not listings), newest first. Pass `nextCursor` as `cursor`. */
    getFeed: procedure.input(pageInput).query(async ({ ctx, input }) => {
        const blockList = await getUserBlockList(ctx);
        return fillVisiblePage(
            (cursor, limit) => getFeed(ctx.db, ctx.user?.id ?? null, { cursor, limit }),
            input,
            (p) => !isBlocked(blockList, p.author.userId),
            (p) => p.id,
        );
    }),

    /**
     * A user's posts (their profile), newest first. NOT_FOUND if the user
     * doesn't exist or either has blocked the other; FORBIDDEN
     * "POSTS_FOLLOWERS_ONLY" if their profile visibility is "followers" and
     * the caller isn't them or a follower. Pass `nextCursor` as `cursor`.
     */
    getUserPosts: procedure
        .input(pageInput.extend({ username: z.string().min(1) }))
        .query(async ({ ctx, input }) => {
            const viewerId = ctx.user?.id ?? null;
            const profile = await getProfileByUsername(ctx.db, input.username, viewerId);
            if (!profile || isBlocked(await getUserBlockList(ctx), profile.userId)) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }
            if (profile.userId !== viewerId && !profile.isFollowing) {
                const settings = await getUserSettings(ctx.db, profile.userId);
                if (settings.privacy.profileVisibility === "followers") {
                    throw new TRPCError({ code: "FORBIDDEN", message: "POSTS_FOLLOWERS_ONLY" });
                }
            }

            return getFeed(ctx.db, viewerId, {
                cursor: input.cursor,
                limit: input.limit,
                authorId: profile.userId,
            });
        }),

    /** Idempotent: saving an already-saved post succeeds. */
    savePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await assertPostNotBlocked(ctx, input.id);
        await savePost(ctx.db, user.id, input.id);
    }),

    /**
     * Reports a post. `details` is required when `reason` is "other".
     * Reporting the same post again updates the reason and details.
     */
    reportPost: procedure.input(reportInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await reportPost(ctx.db, user.id, input.id, input);
    }),

    /** Idempotent: unsaving a post that isn't saved succeeds. */
    unsavePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await unsavePost(ctx.db, user.id, input.id);
    }),

    /** The caller's saved posts, most recently saved first. Pass `nextCursor` as `cursor`. */
    getMySavedPosts: procedure.input(pageInput).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        const blockList = await getUserBlockList(ctx);
        const visible = await fillVisiblePage(
            (cursor, limit) => getSavedPosts(ctx.db, user.id, { cursor, limit }),
            input,
            (p) => !isBlocked(blockList, p.author.userId),
            (p) => p.saveId,
        );
        return { ...visible, items: visible.items.map(({ saveId: _, ...post }) => post) };
    }),

    /**
     * `sort`: "oldest" (default) or "top" (highest score first). Pass the
     * previous page's `nextCursor` as `cursor`, keeping the same `sort`.
     */
    getPostComments: procedure
        .input(
            pageInput.extend({
                postId: z.string().min(1),
                sort: z.enum(["oldest", "top"]).default("oldest"),
            }),
        )
        .query(async ({ ctx, input }) => {
            await assertPostNotBlocked(ctx, input.postId);
            const blockList = await getUserBlockList(ctx);
            return fillVisiblePage(
                (cursor, limit) =>
                    getPostComments(ctx.db, input.postId, ctx.user?.id ?? null, {
                        sort: input.sort,
                        cursor,
                        limit,
                    }),
                input,
                (c) => !isBlocked(blockList, c.author.userId),
                (c) => c.id,
            );
        }),

    /**
     * Returns nothing (fire and forget). `id` is an optional client-generated
     * ULID; retrying with it succeeds without adding the comment again.
     */
    createPostComment: procedure
        .input(z.object({ id: clientId.optional(), postId: z.string().min(1), body: commentBody }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await assertPostNotBlocked(ctx, input.postId);
            await createPostComment(ctx.db, user.id, input.postId, input.body, input.id);
        }),

    /**
     * Sets the caller's vote: 1 (up), -1 (down) or 0 (remove). Returns nothing;
     * resending the same vote is a no-op.
     */
    voteOnPostComment: procedure
        .input(
            z.object({
                id: z.string().min(1),
                value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await assertCommentNotBlocked(ctx, input.id);
            await voteOnPostComment(ctx.db, user.id, input.id, input.value);
        }),

    /**
     * Reports a comment. `details` is required when `reason` is "other".
     * Reporting the same comment again updates the reason and details.
     */
    reportPostComment: procedure.input(reportInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await reportPostComment(ctx.db, user.id, input.id, input);
    }),

    /** Only the comment's author may edit it. */
    updatePostComment: procedure
        .input(z.object({ id: z.string().min(1), body: commentBody }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await updatePostComment(ctx.db, user.id, input.id, input.body);
        }),

    /** The comment's author or the post's author may delete it. */
    deletePostComment: procedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await deletePostComment(ctx.db, user.id, input.id);
        }),

    /**
     * `media`: photo keys from media.createUploadUrl, in display order. `id` is
     * an optional client-generated ULID; retrying with it succeeds without
     * creating the post again. Returns nothing (fire and forget).
     */
    createPost: procedure
        .input(z.object({ id: clientId.optional(), body: postBody, media: mediaInput.default([]) }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);

            if (!ctx.featureFlagStore.isEnabled("usersCanPost")) {
                throw new TRPCError({ code: "FORBIDDEN", message: "POSTING_DISABLED" });
            }

            await createOnce(
                input.id,
                () => isOwnPostId(ctx.db, input.id!, user.id, "post"),
                () =>
                    withMedia(mediaContext(ctx, user.id), input.media, [], (rows) =>
                        createPost(ctx.db, user.id, input.body, rows, input.id),
                    ),
            );
        }),

    /**
     * Omit `media` to leave photos unchanged; send it to replace them (existing
     * keys keep their photo, new upload keys are added, missing ones removed).
     */
    updatePost: procedure
        .input(postIdInput.extend({ body: postBody, media: mediaInput.optional() }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            if (!input.media) return updatePost(ctx.db, user.id, input.id, input.body);

            const existing = await getPostMediaRows(ctx.db, input.id);
            await withMedia(mediaContext(ctx, user.id), input.media, existing, (rows) =>
                updatePost(ctx.db, user.id, input.id, input.body, rows),
            );
        }),

    deletePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await deletePost(ctx.db, user.id, input.id);
    }),
});
