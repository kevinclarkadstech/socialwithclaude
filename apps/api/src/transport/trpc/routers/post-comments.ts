import {
    CreatePostCommentMutationInputSchema,
    CreatePostCommentPhotoUploadMutationInputSchema,
    createPostCommentPhotoUploadMutation,
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
    createNotifications,
} from "../../../data-access";
import { notifyMentions, retractMentions } from "../../../notifications";
import { deletePostCommentPhotoUploads, publishPostCommentPhoto } from "../../../media";
import { storage } from "../../../storage";
import { errorReporter, reportingFailures } from "../../../observability";
import { procedure, router } from "../trpc";

export const postCommentsRouter = router({
    /** Upload URLs for a comment's photo (see createPostCommentPhotoUploadMutation). */
    createPostCommentPhotoUpload: procedure.input(CreatePostCommentPhotoUploadMutationInputSchema).mutation(({ ctx, input }) =>
        createPostCommentPhotoUploadMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: { getCallingUser: ctx.getCallingUser, getPostAccessById, getPostCommentViewById, createUploadUrl: storage.createUploadUrl },
        }),
    ),

    getPostComments: procedure.input(GetPostCommentsQueryInputSchema).query(({ ctx, input }) =>
        getPostCommentsQuery({ input, context: { logger: ctx.logger }, dependencies: { getCallingUser: ctx.getCallingUser, getPostAccessById, getPostCommentViews } }),
    ),

    createPostComment: procedure.input(CreatePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        createPostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getPostAccessById,
                getPostCommentViewById,
                createPostComment,
                sendNotifications: createNotifications,
                notifyMentions,
                publishPostCommentPhoto: (args) => publishPostCommentPhoto({ ...args, storage, logger: ctx.logger }),
                deletePostCommentPhotoUploads: (args) => deletePostCommentPhotoUploads({ ...args, storage }),
            },
        }),
    ),

    updatePostComment: procedure.input(UpdatePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        updatePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getPostCommentViewById,
                updatePostComment,
                notifyMentions,
                retractMentions,
                publishPostCommentPhoto: (args) => publishPostCommentPhoto({ ...args, storage, logger: ctx.logger }),
                deletePostCommentPhotoUploads: (args) => deletePostCommentPhotoUploads({ ...args, storage }),
                // A removed photo whose file wasn't deleted is still public: report it (the edit still succeeds).
                deleteMedia: reportingFailures({ reporter: errorReporter, context: { ...ctx.errorReportContext, procedure: "postComments.updatePostComment" }, run: storage.deleteMedia }),
            },
        }),
    ),

    deletePostComment: procedure.input(DeletePostCommentMutationInputSchema).mutation(({ ctx, input }) =>
        deletePostCommentMutation({
            input,
            context: { logger: ctx.logger },
            dependencies: {
                getCallingUser: ctx.getCallingUser,
                getPostCommentViewById,
                deletePostComment,
                deleteMedia: reportingFailures({ reporter: errorReporter, context: { ...ctx.errorReportContext, procedure: "postComments.deletePostComment" }, run: storage.deleteMedia }),
            },
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
