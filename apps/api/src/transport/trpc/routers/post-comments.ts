import {
    CreatePostCommentMutationInputSchema,
    DeletePostCommentMutationInputSchema,
    DeletePostCommentVoteMutationInputSchema,
    GetPostCommentsQueryInputSchema,
    ReportPostCommentMutationInputSchema,
    UpdatePostCommentMutationInputSchema,
    VoteOnPostCommentMutationInputSchema,
    createPostCommentMutation,
    deletePostCommentMutation,
    deletePostCommentVoteMutation,
    getPostCommentsQuery,
    reportPostCommentMutation,
    updatePostCommentMutation,
    voteOnPostCommentMutation,
} from "@myapp/shared/domains";

import {
    createPostComment,
    createPostCommentReport,
    deletePostComment,
    deletePostCommentVote,
    getPostById,
    getPostCommentById,
    getPostComments,
    setPostCommentVote,
    updatePostComment,
} from "../../../data-access";
import { procedure, router } from "../trpc";

export const postCommentsRouter = router({
    getPostComments: procedure.input(GetPostCommentsQueryInputSchema).query(({ ctx, input }) =>
        getPostCommentsQuery({ input, context: { logger: ctx.logger }, dependencies: { getPostComments } }),
    ),

    createPostComment: procedure.input(CreatePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        createPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostById, createPostComment },
        }),
    ),

    updatePostComment: procedure.input(UpdatePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentById, updatePostComment },
        }),
    ),

    deletePostComment: procedure.input(DeletePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        deletePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentById, deletePostComment },
        }),
    ),

    voteOnPostComment: procedure.input(VoteOnPostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        voteOnPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentById, setPostCommentVote },
        }),
    ),

    deletePostCommentVote: procedure.input(DeletePostCommentVoteMutationInputSchema).mutation(({ ctx, input }) =>
        deletePostCommentVoteMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, deletePostCommentVote },
        }),
    ),

    reportPostComment: procedure.input(ReportPostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        reportPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentById, createPostCommentReport },
        }),
    ),
});
