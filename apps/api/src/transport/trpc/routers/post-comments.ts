import { procedure, router } from "../trpc";


export const postCommentsRouter = router({
    /**
     * `sort`: "oldest" (default), "newest" or "top" (highest score first). Pass the
     * previous page's `nextCursor` as `cursor`, keeping the same `sort`.
     */
    getPostComments: procedure
        .input(
            pageInput.extend({
                postId: z.string().min(1),
                sort: z.enum(["oldest", "newest", "top"]).default("oldest"),
            }),
        )
        .query(async ({ ctx, input }) => {
            // await assertPostNotBlocked(ctx, input.postId);
            // const blockList = await getUserBlockList(ctx);
            // return fillVisiblePage(
            //     (cursor, limit) =>
            //         getPostComments(ctx.db, input.postId, ctx.user?.id ?? null, {
            //             sort: input.sort,
            //             cursor,
            //             limit,
            //         }),
            //     input,
            //     (c) => !isBlocked(blockList, c.author.userId),
            //     (c) => c.id,
            // );
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
});