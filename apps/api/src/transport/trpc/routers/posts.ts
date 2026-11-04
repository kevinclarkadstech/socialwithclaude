import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getPostByIdQuery } from '@myapp/shared/domains'
import { mediaContext, requireUserAndProfile, type TRPCContext } from "../context";
import { clientId, createOnce } from "../client-ids";
import { mediaInput, reportInput } from "../inputs";
import { procedure, router } from "../trpc";
import { GetPostByIdQueryInputSchema } from "@myapp/shared/domains/posts/queries/getPostByIdQuery";

/**
 * POST_NOT_FOUND if the caller and the post's author have blocked each other.
 * A missing post is left for the data-access call to report.
 */
// async function assertPostNotBlocked(ctx: TRPCContext, postId: string) {
//     if (!ctx.user) return;
//     const authorId = await getPostAuthorId(ctx.db, postId);
//     if (authorId && isBlocked(await getUserBlockList(ctx), authorId)) throw postNotFound();
// }

/** COMMENT_NOT_FOUND if the caller is blocked with the comment's or the post's author. */
// async function assertCommentNotBlocked(ctx: TRPCContext, commentId: string) {
//     if (!ctx.user) return;
//     const authors = await getPostCommentAuthorIds(ctx.db, commentId);
//     if (!authors) return;
//     const blockList = await getUserBlockList(ctx);
//     if (isBlocked(blockList, authors.authorId) || isBlocked(blockList, authors.postAuthorId)) {
//         throw commentNotFound();
//     }
// }

/**
 * A page of posts or listings matching `query` that the caller can see:
 * authors blocked either way are left out. Pass `nextCursor` as `cursor`.
 */
// export async function searchVisiblePosts(
//     ctx: TRPCContext,
//     query: string,
//     { kind, ...page }: { kind: "post" | "listing"; cursor?: string | null; limit: number },
// ) {
//     const blockList = await getUserBlockList(ctx);
//     return fillVisiblePage(
//         (cursor, limit) =>
//             searchPosts(ctx.db, query, { kind, cursor, limit, viewerId: ctx.user?.id ?? null }),
//         page,
//         (p) => !isBlocked(blockList, p.author.userId),
//         (p) => p.id,
//     );
// }

/*
 * Followers-only profiles: their posts and listings are only returned to the
 * author and accepted followers (the data-access resolvers filter with
 * postVisibleTo). Anyone else gets POST_NOT_FOUND / COMMENT_NOT_FOUND, or
 * doesn't see them in lists, as if they didn't exist. Blocks are filtered
 * here, in the API layer.
 */
export const postsRouter = router({
    /** POST_NOT_FOUND if it doesn't exist, or the caller can't see it. */
    getPostById: procedure
        .input(GetPostByIdQueryInputSchema)
        .query(async ({ ctx, input }) => {
            // const post = await getPostById(ctx.db, input.id, ctx.user?.id ?? null);
            // if (!post || isBlocked(await getUserBlockList(ctx), post.author.userId)) throw postNotFound();
            const result = await getPostByIdQuery({
                input, dependencies: {
                    fetchPostById: async (postId) => {
                        return getPostById(ctx.db, postId, ctx.user?.id ?? null)
                    }
                }
            })
            return result;
        }),

    /**
     * The Feed tab: regular posts (not listings) the caller can see, newest
     * first. Pass `nextCursor` as `cursor`.
     */
    getFeed: procedure.input(pageInput).query(async ({ ctx, input }) => {
        // const blockList = await getUserBlockList(ctx);
        // return fillVisiblePage(
        //     (cursor, limit) => getFeed(ctx.db, ctx.user?.id ?? null, { cursor, limit }),
        //     input,
        //     (p) => !isBlocked(blockList, p.author.userId),
        //     (p) => p.id,
        // );
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
            // const profile = await getProfileByUsername(ctx.db, input.username, viewerId);
            // if (!profile || isBlocked(await getUserBlockList(ctx), profile.userId)) {
            //     throw new TRPCError({ code: "NOT_FOUND" });
            // }
            // if (profile.userId !== viewerId && !profile.isFollowing) {
            //     const settings = await getUserSettings(ctx.db, profile.userId);
            //     if (settings.privacy.profileVisibility === "followers") {
            //         throw new TRPCError({ code: "FORBIDDEN", message: "POSTS_FOLLOWERS_ONLY" });
            //     }
            // }

            // return getFeed(ctx.db, viewerId, {
            //     cursor: input.cursor,
            //     limit: input.limit,
            //     authorId: profile.userId,
            // });
        }),

    /** Idempotent: saving an already-saved post succeeds. */
    savePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        // await assertPostNotBlocked(ctx, input.id);
        // await savePost(ctx.db, user.id, input.id);
    }),

    /**
     * Reports a post. `details` is required when `reason` is "other".
     * Reporting the same post again updates the reason and details.
     */
    reportPost: procedure.input(reportInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        // await reportPost(ctx.db, user.id, input.id, input);
    }),

    /** Idempotent: unsaving a post that isn't saved succeeds. */
    unsavePost: procedure.input(postIdInput).mutation(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        // await unsavePost(ctx.db, user.id, input.id);
    }),

    /**
     * The caller's saved posts, most recently saved first, minus ones they can
     * no longer see. Pass `nextCursor` as `cursor`.
     */
    getMySavedPosts: procedure.input(pageInput).query(async ({ ctx, input }) => {
        const { user } = await requireUserAndProfile(ctx);
        // const blockList = await getUserBlockList(ctx);
        // const visible = await fillVisiblePage(
        //     (cursor, limit) => getSavedPosts(ctx.db, user.id, { cursor, limit }),
        //     input,
        //     (p) => !isBlocked(blockList, p.author.userId),
        //     (p) => p.saveId,
        // );
        // return { ...visible, items: visible.items.map(({ saveId: _, ...post }) => post) };
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
     * Regular posts only (POST_NOT_FOUND for a listing; use
     * listings.updateListing). Omit `media` to leave photos unchanged; send it
     * to replace them (existing keys keep their photo, new upload keys are
     * added, missing ones removed).
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
