import { z } from "zod";
import { commentBody, postBody } from "@myapp/shared/types/posts";
import { TRPCError } from "@trpc/server";
import {
    getFeedQuery,
    getMySavedPostsQuery,
    getPostByIdQuery,
    getPostCommentsQuery,
    getUserPostsQuery,
    getFeedInput,
    getMySavedPostsInput,
    getPostByIdInput,
    getPostCommentsInput,
    getUserPostsInput,
    type GetFeedDependencies,
    type GetMySavedPostsDependencies,
    type GetPostByIdDependencies,
    type GetPostCommentsDependencies,
    type GetUserPostsDependencies,
} from "@myapp/shared/domains/posts";

import {
    createPostComment,
    createPost,
    deletePost,
    deletePostComment,
    getFeed,
    getProfileByUsername,
    getPostAuthorId,
    PostNotFoundError,
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
import { mediaContext, queryContext, requireUserAndProfile, type TRPCContext } from "../context";
import { toPost, toPostComment, toPostDetail, toSavedPost } from "../mappers/posts";
import { validateInput } from "../validate-input";
import { clientId, createOnce } from "../client-ids";
import { mediaInput, reportInput } from "../inputs";
import { procedure, router } from "../trpc";

const postIdInput = z.object({ id: z.string().min(1) });

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

type PostQueryDependencies = GetPostByIdDependencies &
    GetFeedDependencies &
    GetUserPostsDependencies &
    GetMySavedPostsDependencies &
    GetPostCommentsDependencies;

/**
 * Data access for the shared post queries, for this request's viewer. Rows
 * are mapped to the shared public types here; followers-only visibility is
 * applied by the data-access resolvers, blocks by the queries.
 */
function postQueryDependencies(ctx: TRPCContext): PostQueryDependencies {
    const viewerId = ctx.user?.id ?? null;
    const feedPage = async (authorId: string | undefined, cursor: string | null, limit: number) => {
        const page = await getFeed(ctx.db, viewerId, { cursor, limit, authorId });
        return { items: page.items.map(toPost), nextCursor: page.nextCursor };
    };

    return {
        fetchBlockList: () => getUserBlockList(ctx),
        fetchPostById: async (postId) => {
            const post = await getPostById(ctx.db, postId, viewerId);
            return post && toPostDetail(post);
        },
        fetchFeedPage: (cursor, limit) => feedPage(undefined, cursor, limit),
        fetchUserPostsPage: (authorId, cursor, limit) => feedPage(authorId, cursor, limit),
        fetchAuthorByUsername: async (username) => {
            const profile = await getProfileByUsername(ctx.db, username, viewerId);
            return (
                profile && {
                    userId: profile.userId,
                    isFollowing: profile.isFollowing,
                    requiresApproval: profile.requiresApproval,
                }
            );
        },
        fetchSavedPostsPage: async (cursor, limit) => {
            // Saved posts are only read for the signed-in viewer (the query checks).
            const page = await getSavedPosts(ctx.db, viewerId!, { cursor, limit });
            return {
                items: page.items.map((row) => ({ post: toSavedPost(row), cursor: row.saveId })),
                nextCursor: page.nextCursor,
            };
        },
        fetchPostAuthorId: (postId) => getPostAuthorId(ctx.db, postId),
        fetchCommentsPage: async (postId, sort, cursor, limit) => {
            try {
                const page = await getPostComments(ctx.db, postId, viewerId, { sort, cursor, limit });
                return { items: page.items.map(toPostComment), nextCursor: page.nextCursor };
            } catch (err) {
                // Missing, deleted, or not visible to the viewer.
                if (err instanceof PostNotFoundError) return null;
                throw err;
            }
        },
    };
}

/*
 * Followers-only profiles: their posts and listings are only returned to the
 * author and accepted followers (the data-access resolvers filter with
 * postVisibleTo). Anyone else gets POST_NOT_FOUND / COMMENT_NOT_FOUND, or
 * doesn't see them in lists, as if they didn't exist. Blocks are filtered
 * here, in the API layer.
 */
export const postsRouter = router({
    /*
     * Reads return a Result ({ value, error }), never a tRPC error: invalid
     * input is a "validation" error (validateInput), and everything else is
     * the shared query's Result as-is (see @myapp/shared/domains/posts).
     */

    /** One post or listing. Fails with "entity-not-found" if it doesn't exist or the caller can't see it. */
    getPostById: procedure.input(validateInput(getPostByIdInput)).query(({ ctx, input }) =>
        input.error
            ? input
            : getPostByIdQuery({ input: input.value, context: queryContext(ctx), dependencies: postQueryDependencies(ctx) }),
    ),

    /** The Feed tab: regular posts the caller can see, newest first. Pass `nextCursor` as `cursor`. */
    getFeed: procedure.input(validateInput(getFeedInput)).query(({ ctx, input }) =>
        input.error
            ? input
            : getFeedQuery({ input: input.value, context: queryContext(ctx), dependencies: postQueryDependencies(ctx) }),
    ),

    /**
     * A user's posts (their profile), newest first. Fails with
     * "entity-not-found" (no such user, or blocked) or "authorization" (their
     * profile is followers-only). Pass `nextCursor` as `cursor`.
     */
    getUserPosts: procedure.input(validateInput(getUserPostsInput)).query(({ ctx, input }) =>
        input.error
            ? input
            : getUserPostsQuery({ input: input.value, context: queryContext(ctx), dependencies: postQueryDependencies(ctx) }),
    ),

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

    /**
     * The caller's saved posts, most recently saved first, minus ones they can
     * no longer see. Fails with "authentication" when signed out. Pass
     * `nextCursor` as `cursor`.
     */
    getMySavedPosts: procedure.input(validateInput(getMySavedPostsInput)).query(({ ctx, input }) =>
        input.error
            ? input
            : getMySavedPostsQuery({ input: input.value, context: queryContext(ctx), dependencies: postQueryDependencies(ctx) }),
    ),

    /**
     * A post's comments: `sort` "oldest" (default), "newest" or "top". Fails with
     * "entity-not-found" if the caller can't see the post. Pass `nextCursor` as
     * `cursor`, keeping the same `sort`.
     */
    getPostComments: procedure.input(validateInput(getPostCommentsInput)).query(({ ctx, input }) =>
        input.error
            ? input
            : getPostCommentsQuery({ input: input.value, context: queryContext(ctx), dependencies: postQueryDependencies(ctx) }),
    ),

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
