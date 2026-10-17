import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    createPostComment,
    createPost,
    deletePost,
    deletePostComment,
    getFeed,
    getPostById,
    getPostComments,
    getPostMediaRows,
    getSavedPosts,
    savePost,
    unsavePost,
    updatePost,
    updatePostComment,
    voteOnPostComment,
} from "../../data-access";
import { withMedia } from "../../media";
import { mediaContext, requireUserAndProfile } from "../context";
import { mediaInput } from "../inputs";
import { procedure, router } from "../trpc";

const postIdInput = z.object({ id: z.string().min(1) });
const postBody = z.string().trim().min(1).max(1000);
const commentBody = z.string().trim().min(1).max(1000);
const pageInput = z.object({
    cursor: z.string().nullish(),
    limit: z.number().int().min(1).max(100).default(20),
});

export const postsRouter = router({
    getPostById: procedure.input(postIdInput).query(async ({ ctx, input }) => {
        const post = await getPostById(ctx.db, input.id, ctx.user?.id ?? null);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "POST_NOT_FOUND" });

        return post;
    }),

    /** The Feed tab: regular posts (not listings), newest first. Pass `nextCursor` as `cursor`. */
    getFeed: procedure
        .input(pageInput)
        .query(({ ctx, input }) => getFeed(ctx.db, ctx.user?.id ?? null, input)),

    /** Idempotent: saving an already-saved post succeeds. */
    savePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await savePost(ctx.db, user.id, input.id);
    }),

    /** Idempotent: unsaving a post that isn't saved succeeds. */
    unsavePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await unsavePost(ctx.db, user.id, input.id);
    }),

    /** The caller's saved posts, most recently saved first. Pass `nextCursor` as `cursor`. */
    getMySavedPosts: procedure.input(pageInput).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        return getSavedPosts(ctx.db, user.id, input);
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
        .query(({ ctx, input }) =>
            getPostComments(ctx.db, input.postId, ctx.user?.id ?? null, input),
        ),

    /** Returns the comment in the same shape as getPostComments items. */
    createPostComment: procedure
        .input(z.object({ postId: z.string().min(1), body: commentBody }))
        .mutation(async ({ ctx, input }) => {
            const { profile } = await requireUserAndProfile(ctx);
            const comment = await createPostComment(ctx.db, profile.userId, input.postId, input.body);

            const { userId, username, firstName, lastName, avatarUrl } = profile;
            return {
                ...comment,
                author: { userId, username, firstName, lastName, avatarUrl },
                myVote: 0,
            };
        }),

    /**
     * Sets the caller's vote: 1 (up), -1 (down) or 0 (remove). Returns the
     * comment's new counts and the caller's vote.
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
            return voteOnPostComment(ctx.db, user.id, input.id, input.value);
        }),

    /** Only the comment's author may edit it. */
    updatePostComment: procedure
        .input(z.object({ id: z.string().min(1), body: commentBody }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            return updatePostComment(ctx.db, user.id, input.id, input.body);
        }),

    /** The comment's author or the post's author may delete it. */
    deletePostComment: procedure
        .input(z.object({ id: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            await deletePostComment(ctx.db, user.id, input.id);
        }),

    /** `media`: photo keys from media.createUploadUrl, in display order. */
    createPost: procedure
        .input(z.object({ body: postBody, media: mediaInput.default([]) }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);

            if (!ctx.featureFlagStore.isEnabled("usersCanPost")) {
                throw new TRPCError({ code: "FORBIDDEN", message: "POSTING_DISABLED" });
            }

            return withMedia(mediaContext(ctx, user.id), input.media, [], (rows) =>
                createPost(ctx.db, user.id, input.body, rows),
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
            return withMedia(mediaContext(ctx, user.id), input.media, existing, (rows) =>
                updatePost(ctx.db, user.id, input.id, input.body, rows),
            );
        }),

    deletePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await deletePost(ctx.db, user.id, input.id);
    }),
});
