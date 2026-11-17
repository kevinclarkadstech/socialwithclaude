import z from "zod";
import type { Mutation } from "../../../../types/mutation";
import { fail, succeed } from "../../../../utils/result";
import { conflictError, notFoundError, validationError } from "../../../../error-handling";
import { logDisallowedResult } from "../../../../authorization/logDisallowedResult/logDisallowedResult";
import { photoKeys } from "../../../../media/utils";
import { postPhotoSizes } from "../../../posts/constants";
import type { PostMedia } from "../../../posts/types/post-media";
import { cleanUpAfterSave } from "../../../posts/utils/cleanUpAfterSave/cleanUpAfterSave";
import { postCommentPhotoKeys } from "../../../posts/utils/postCommentPhotoKeys/postCommentPhotoKeys";
import type { PostCommentPhoto } from "../../../posts/types/post-comment-photo";
import type { ReportStatus } from "../../../posts/types/report";
import type { GetCallingUser } from "../../../users/types/calling-user";
import { canAdminister } from "../../authorization/canAdminister/canAdminister";
import type { ModerationActionType } from "../../types/moderation-action";
import { ReportKindSchema, ReportOutcomeSchema, type ReportKind, type ReportOutcome, type ReportedItem } from "../../types/reported-item";

export const ResolveReportsMutationInputSchema = z.object({
    kind: ReportKindSchema,
    targetId: z.ulid(),
    outcome: ReportOutcomeSchema,
    // Why, for the moderation log.
    note: z.string().trim().max(1000).nullish(),
});

export type ResolveReportsMutationInput = z.infer<typeof ResolveReportsMutationInputSchema>;

export const ResolveReportsMutationOutputSchema = z.object({
    resolvedCount: z.int().min(0),
});

export type ResolveReportsMutationOutput = z.infer<typeof ResolveReportsMutationOutputSchema>;

/** What each outcome sets its reports to, and logs as. */
const outcomes: Record<ReportOutcome, { status: ReportStatus; action: ModerationActionType }> = {
    dismissed: { status: "dismissed", action: "dismiss_reports" },
    removed: { status: "reviewed", action: "remove_content" },
    reviewed: { status: "reviewed", action: "mark_reviewed" },
};

/**
 * Settles every open report about one thing, and logs it: dismiss them,
 * remove the thing (a post with its photos' files, a comment with its photo's, a chat
 * message; a profile can't be removed, its person can be banned), or mark
 * them reviewed after dealing with it another way. Everyone who reported
 * it is told the outcome. Admins only.
 */
export const resolveReportsMutation: Mutation<{ input: ResolveReportsMutationInput, output: ResolveReportsMutationOutput }, {
    getCallingUser: GetCallingUser;
    getReportedItem: (args: { kind: ReportKind; targetId: string }) => Promise<ReportedItem | null>;
    getPostMediaByPostId: (args: { postId: string }) => Promise<PostMedia[]>;
    deletePost: (args: { id: string; userId: string }) => Promise<boolean>;
    /** Deletes published photo files. */
    deleteMedia: (args: { keys: string[] }) => Promise<void>;
    deletePostComment: (args: { id: string; userId: string }) => Promise<boolean>;
    /** A comment's photo as it is now (not as reported), to delete its files with it. */
    getPostCommentPhoto: (args: { postCommentId: string }) => Promise<PostCommentPhoto | null>;
    deleteChatMessage: (args: { id: string; userId: string }) => Promise<boolean>;
    /**
     * Sets the thing's open reports to `status`, logs the action, and tells
     * each reporter how it went (a "report_resolved" notification), in one go.
     * How many reports it settled.
     */
    resolveReports: (args: {
        kind: ReportKind;
        targetId: string;
        outcome: ReportOutcome;
        status: ReportStatus;
        action: ModerationActionType;
        subjectUserId: string;
        moderatorId: string;
        note: string | null;
    }) => Promise<number>;
}> = async ({ input, context: { logger }, dependencies }) => {
    const caller = await dependencies.getCallingUser();
    const allowed = canAdminister({ caller });
    if (!allowed.ok) {
        logDisallowedResult({ logger, result: allowed, details: { action: "resolve-reports", callerId: caller?.userId } });
        return allowed;
    }
    const moderatorId = allowed.value.userId;

    const item = await dependencies.getReportedItem({ kind: input.kind, targetId: input.targetId });
    if (!item) {
        return fail(notFoundError("Nothing reported with that id"));
    }
    if (!item.isOpen) {
        return fail(conflictError("These reports were already handled"));
    }
    if (input.outcome === "removed" && item.kind === "profile") {
        return fail(validationError("A profile can't be removed. Ban them instead."));
    }

    if (input.outcome === "removed") {
        if (item.kind === "post") {
            const media = await dependencies.getPostMediaByPostId({ postId: item.targetId });
            const deleted = await dependencies.deletePost({ id: item.targetId, userId: moderatorId });
            // As when its author deletes it: the post goes either way, and files left behind are logged and swept up later.
            if (deleted && media.length > 0) {
                await cleanUpAfterSave({
                    logger,
                    level: "error",
                    what: "photos",
                    postId: item.targetId,
                    run: () => dependencies.deleteMedia({
                        keys: media.flatMap((photo) => photoKeys({ userId: item.subject.userId, parentId: item.targetId, photoId: photo.id, sizes: postPhotoSizes })),
                    }),
                });
            }
        }
        if (item.kind === "postComment") {
            const photo = await dependencies.getPostCommentPhoto({ postCommentId: item.targetId });
            const deleted = await dependencies.deletePostComment({ id: item.targetId, userId: moderatorId });
            if (deleted && photo) {
                await cleanUpAfterSave({
                    logger,
                    level: "error",
                    what: "comment photo",
                    postId: item.snapshot.postId,
                    run: () => dependencies.deleteMedia({ keys: postCommentPhotoKeys(photo) }),
                });
            }
        }
        if (item.kind === "chatMessage") {
            await dependencies.deleteChatMessage({ id: item.targetId, userId: moderatorId });
        }
    }

    const { status, action } = outcomes[input.outcome];
    const resolvedCount = await dependencies.resolveReports({
        kind: item.kind,
        targetId: item.targetId,
        outcome: input.outcome,
        status,
        action,
        subjectUserId: item.subject.userId,
        moderatorId,
        note: input.note ?? null,
    });
    logger.info("Reports resolved", { moderatorId, kind: item.kind, targetId: item.targetId, outcome: input.outcome, resolvedCount });
    return succeed({ resolvedCount });
};
