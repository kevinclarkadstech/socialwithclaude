import {
    CreatePostMutationInputSchema,
    DeletePostMutationInputSchema,
    GetFeedQueryInputSchema,
    GetPostByIdQueryInputSchema,
    GetUserPostsQueryInputSchema,
    ReportPostMutationInputSchema,
    UpdatePostMutationInputSchema,
    createPostMutation,
    deletePostMutation,
    getFeedQuery,
    getPostByIdQuery,
    getUserPostsQuery,
    reportPostMutation,
    updatePostMutation,
} from "@myapp/shared/domains";

import {
    createPost,
    createPostReport,
    deletePost,
    getPostById,
    getPosts,
    getUserProfileByUsername,
    updatePost,
} from "../../../data-access";
import { procedure, router } from "../trpc";

export const postsRouter = router({
    getPostById: procedure.input(GetPostByIdQueryInputSchema).query(({ ctx, input }) =>
        getPostByIdQuery({ input, context: { logger: ctx.logger }, dependencies: { getPostById } }),
    ),

    getFeed: procedure.input(GetFeedQueryInputSchema).query(({ ctx, input }) =>
        getFeedQuery({ input, context: { logger: ctx.logger }, dependencies: { getPosts } }),
    ),

    getUserPosts: procedure.input(GetUserPostsQueryInputSchema).query(({ ctx, input }) =>
        getUserPostsQuery({ input, context: { logger: ctx.logger }, dependencies: { getUserProfileByUsername, getPosts } }),
    ),

    createPost: procedure.input(CreatePostMutationInputSchema).mutation(({ ctx, input }) =>
        createPostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                isPostingEnabled: () => ctx.featureFlagStore.isEnabled("usersCanPost"),
                getPostById,
                createPost,
            },
        }),
    ),

    updatePost: procedure.input(UpdatePostMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, updatePost },
        }),
    ),

    deletePost: procedure.input(DeletePostMutationInputSchema).mutation(({ ctx, input }) =>
        deletePostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, deletePost },
        }),
    ),

    reportPost: procedure.input(ReportPostMutationInputSchema).mutation(({ ctx, input }) =>
        reportPostMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, createPostReport },
        }),
    ),
});
