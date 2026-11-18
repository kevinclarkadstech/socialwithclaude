import z from "zod";
import { ChatMessageReportSchema } from "../../chats/types/chat-message-report";
import { PostCommentReportSchema } from "../../posts/types/post-comment-report";
import { PostReportSchema } from "../../posts/types/post-report";
import { ReportReasonSchema, ReportStatusSchema } from "../../posts/types/report";
import { ProfileReportSchema } from "../../users/types/profile-report";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";
import { UserRoleSchema } from "../../users/types/user-role";

/** What a report is about. */
export const ReportKindSchema = z.enum(["post", "postComment", "profile", "chatMessage"]);

/**
 * How a moderator settled a reported thing's open reports: nothing wrong
 * ("dismissed"), took it down ("removed"), or dealt with it another way,
 * e.g. a ban ("reviewed").
 */
export const ReportOutcomeSchema = z.enum(["dismissed", "removed", "reviewed"]);

/** One person's report, as a moderator sees it. */
export const ReportEntrySchema = z.object({
    id: z.ulid(),
    reason: ReportReasonSchema,
    details: z.string().nullable(),
    status: ReportStatusSchema,
    createdAt: z.iso.datetime(),
    // Null if the reporter has no profile any more.
    reporter: UserProfileSummarySchema.nullable(),
});

/** Whoever the reported thing is by (or who was reported), and whether they're banned. */
export const ModerationSubjectSchema = z.object({
    userId: z.ulid(),
    // Null if they have no profile (or their account was deleted).
    username: z.string().nullable(),
    // Their account was deleted: the reports and the log about them are kept, but there's no one left to warn or ban.
    isDeleted: z.boolean(),
    role: UserRoleSchema,
    isBanned: z.boolean(),
    // When their ban ends; null if they aren't banned or it never ends.
    banExpires: z.iso.datetime().nullable(),
    // What admins did about them in the last 90 days, to weigh before acting (see moderationHistoryDays).
    history: z.object({
        warnings: z.int().min(0),
        removals: z.int().min(0),
        bans: z.int().min(0),
    }),
});

const reportedItemFields = {
    targetId: z.ulid(),
    subject: ModerationSubjectSchema,
    // Newest first. The open queue shows the open ones; the resolved list, every one.
    reports: z.array(ReportEntrySchema),
    firstReportedAt: z.iso.datetime(),
    lastReportedAt: z.iso.datetime(),
    // Any of its reports still waiting for a moderator.
    isOpen: z.boolean(),
};

/**
 * One reported thing in the moderation queue: every report about it, and
 * the newest report's snapshot (it as it was when last reported).
 */
export const ReportedItemSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("post"), snapshot: PostReportSchema.shape.snapshot, ...reportedItemFields }),
    z.object({ kind: z.literal("postComment"), snapshot: PostCommentReportSchema.shape.snapshot, ...reportedItemFields }),
    z.object({ kind: z.literal("profile"), snapshot: ProfileReportSchema.shape.snapshot, ...reportedItemFields }),
    z.object({ kind: z.literal("chatMessage"), snapshot: ChatMessageReportSchema.shape.snapshot, ...reportedItemFields }),
]);

export type ReportKind = z.infer<typeof ReportKindSchema>;
export type ReportOutcome = z.infer<typeof ReportOutcomeSchema>;
export type ReportEntry = z.infer<typeof ReportEntrySchema>;
export type ModerationSubject = z.infer<typeof ModerationSubjectSchema>;
export type ReportedItem = z.infer<typeof ReportedItemSchema>;
