import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
    createPostComment,
    createPost,
    deletePost,
    deletePostComment,
    getPostById,
    getPostComments,
    updatePost,
    updatePostComment,
} from "../../data-access";
import { requireUserAndProfile } from "../context";
import { procedure, router } from "../trpc";

const postIdInput = z.object({ id: z.string().min(1) });
const postBody = z.string().trim().min(1).max(1000);
const commentBody = z.string().trim().min(1).max(1000);

export const postsRouter = router({
    getPostById: procedure.input(postIdInput).query(async ({ ctx, input }) => {
        const post = await getPostById(ctx.db, input.id);
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "POST_NOT_FOUND" });

        return post;
    }),

    /** Oldest first. Pass the previous page's `nextCursor` as `cursor`. */
    getPostComments: procedure
        .input(
            z.object({
                postId: z.string().min(1),
                cursor: z.string().nullish(),
                limit: z.number().int().min(1).max(100).default(20),
            }),
        )
        .query(({ ctx, input }) =>
            getPostComments(ctx.db, input.postId, { cursor: input.cursor, limit: input.limit }),
        ),

    /** Returns the comment with the same `author` shape as getPostComments. */
    createPostComment: procedure
        .input(z.object({ postId: z.string().min(1), body: commentBody }))
        .mutation(async ({ ctx, input }) => {
            const { profile } = await requireUserAndProfile(ctx);
            const comment = await createPostComment(ctx.db, profile.userId, input.postId, input.body);

            const { userId, username, firstName, lastName, avatarUrl } = profile;
            return { ...comment, author: { userId, username, firstName, lastName, avatarUrl } };
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

    createPost: procedure.input(z.object({ body: postBody })).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);

        if (!ctx.featureFlagStore.isEnabled("usersCanPost")) {
            throw new TRPCError({ code: "FORBIDDEN", message: "POSTING_DISABLED" });
        }

        return createPost(ctx.db, user.id, input.body);
    }),

    updatePost: procedure
        .input(postIdInput.extend({ body: postBody }))
        .mutation(async ({ ctx, input }) => {
            const { user } = await requireUserAndProfile(ctx);
            return updatePost(ctx.db, user.id, input.id, input.body);
        }),

    deletePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        await deletePost(ctx.db, user.id, input.id);
    }),
});
