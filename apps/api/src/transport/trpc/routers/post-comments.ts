import {
    CreatePostCommentMutationInputSchema,
    DeletePostCommentMutationInputSchema,
    GetPostCommentsQueryInputSchema,
    ReportPostCommentMutationInputSchema,
    UpdatePostCommentMutationInputSchema,
    SetPostCommentVoteMutationInputSchema,
    createPostCommentMutation,
    deletePostCommentMutation,
    getPostCommentsQuery,
    reportPostCommentMutation,
    updatePostCommentMutation,
    setPostCommentVoteMutation,
} from "@myapp/shared/domains";

import {
    createPostComment,
    createPostCommentReport,
    deletePostComment,
    deletePostCommentVote,
    getPostViewById,
    getPostCommentViewById,
    getPostCommentViews,
    setPostCommentVote,
    updatePostComment,
} from "../../../data-access";
import { procedure, router } from "../trpc";

export const postCommentsRouter = router({
    getPostComments: procedure.input(GetPostCommentsQueryInputSchema).query(({ ctx, input }) =>
        getPostCommentsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentViews } }),
    ),

    createPostComment: procedure.input(CreatePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        createPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostViewById, getPostCommentViewById, createPostComment },
        }),
    ),

    updatePostComment: procedure.input(UpdatePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentViewById, updatePostComment },
        }),
    ),

    deletePostComment: procedure.input(DeletePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        deletePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentViewById, deletePostComment },
        }),
    ),

    setPostCommentVote: procedure.input(SetPostCommentVoteMutationInputSchema).mutation(({ ctx, input }) =>
        setPostCommentVoteMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentViewById, setPostCommentVote, deletePostCommentVote },
        }),
    ),

    reportPostComment: procedure.input(ReportPostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        reportPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentViewById, createPostCommentReport },
        }),
    ),
});
