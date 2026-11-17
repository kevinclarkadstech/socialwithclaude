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
    SavePostCommentMutationInputSchema,
    UnsavePostCommentMutationInputSchema,
    savePostCommentMutation,
    unsavePostCommentMutation,
} from "@myapp/shared/domains";

import {
    createPostComment,
    createPostCommentReport,
    deletePostComment,
    deletePostCommentVote,
    getPostAccessById,
    getPostCommentViewById,
    getPostCommentViews,
    setPostCommentVote,
    updatePostComment,
    createUserSave,
    deleteUserSave,
} from "../../../data-access";
import { procedure, router } from "../trpc";

export const postCommentsRouter = router({
    getPostComments: procedure.input(GetPostCommentsQueryInputSchema).query(({ ctx, input }) =>
        getPostCommentsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostAccessById, getPostCommentViews } }),
    ),

    createPostComment: procedure.input(CreatePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        createPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostAccessById, getPostCommentViewById, createPostComment },
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
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentViewById, getPostAccessById, setPostCommentVote, deletePostCommentVote },
        }),
    ),

    reportPostComment: procedure.input(ReportPostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        reportPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostCommentViewById, createPostCommentReport },
        }),
    ),

    save: procedure.input(SavePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        savePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getPostCommentViewById,
                getPostAccessById,
                savePostComment: ({ userId, postCommentId }) => createUserSave({ userId, type: "postComment", id: postCommentId }),
            },
        }),
    ),

    unsave: procedure.input(UnsavePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        unsavePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                unsavePostComment: ({ userId, postCommentId }) => deleteUserSave({ userId, type: "postComment", id: postCommentId }),
            },
        }),
    ),
});
