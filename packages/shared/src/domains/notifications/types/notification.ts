import z from "zod";
import { ReportKindSchema, ReportOutcomeSchema } from "../../admin/types/reported-item";
import { ReportReasonSchema } from "../../posts/types/report";
import { UserProfileSummarySchema } from "../../users/types/user-profile-summary";
import { PostCommentPhotoSchema } from "../../posts/types/post-comment-photo";

/**
 * Something the app tells one person, shown on their Notifications page.
 * `data` depends on `type`; the app turns it into words (default messages),
 * so the wording can change without touching stored notifications.
 * - "warning": an admin warned them about something they posted or did.
 * - "report_resolved": a report they sent was dealt with, and how.
 * - "followed": `actorId` started following them (a public account).
 * - "follow_requested": `actorId` asked to follow them (a followers-only account).
 * - "follow_accepted": `actorId` accepted their request to follow.
 * - "commented": `actorId` commented on their post.
 * - "mentioned": `actorId` @-mentioned them in a post or comment.
 */
const NotificationFieldsSchema = z.object({
    id: z.ulid(),
    // Who it's for.
    userId: z.ulid(),
    // Who did it: null for the app's own (warnings, report updates).
    actorId: z.ulid().nullable(),
    // Null until they've seen it.
    readAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
});

export const WarningNotificationDataSchema = z.object({
    reason: ReportReasonSchema,
    // The admin's own words, if any.
    note: z.string().trim().max(1000).nullable(),
    // What it was about, when it came from a report.
    kind: ReportKindSchema.nullable(),
});

export const ReportResolvedNotificationDataSchema = z.object({
    kind: ReportKindSchema,
    outcome: ReportOutcomeSchema,
});

/** How much of a comment a "commented" notification shows. */
export const commentExcerptLength = 100;

export const CommentedNotificationDataSchema = z.object({
    postId: z.ulid(),
    postCommentId: z.ulid(),
    // The start of the comment (commentExcerptLength).
    excerpt: z.string(),
});

export const MentionedNotificationDataSchema = z.object({
    postId: z.ulid(),
    // The comment they were mentioned in; null for the post itself.
    postCommentId: z.ulid().nullable(),
});

const NoDataSchema = z.object({});

export const NotificationSchema = z.discriminatedUnion("type", [
    NotificationFieldsSchema.extend({ type: z.literal("warning"), data: WarningNotificationDataSchema }),
    NotificationFieldsSchema.extend({ type: z.literal("report_resolved"), data: ReportResolvedNotificationDataSchema }),
    NotificationFieldsSchema.extend({ type: z.literal("followed"), data: NoDataSchema }),
    NotificationFieldsSchema.extend({ type: z.literal("follow_requested"), data: NoDataSchema }),
    NotificationFieldsSchema.extend({ type: z.literal("follow_accepted"), data: NoDataSchema }),
    NotificationFieldsSchema.extend({ type: z.literal("commented"), data: CommentedNotificationDataSchema }),
    NotificationFieldsSchema.extend({ type: z.literal("mentioned"), data: MentionedNotificationDataSchema }),
]);

export const NotificationTypeSchema = z.enum(["warning", "report_resolved", "followed", "follow_requested", "follow_accepted", "commented", "mentioned"]);

/**
 * A notification as its recipient sees it: with who did it (null for the
 * app's own, or if they have no profile any more), and for "commented", the
 * comment's photo if it has one (shown as a thumbnail).
 */
export const NotificationViewSchema = z.intersection(NotificationSchema, z.object({
    actor: UserProfileSummarySchema.nullable(),
    commentPhoto: PostCommentPhotoSchema.nullable(),
}));

/** A notification to send: who it's for, who did it, and what. Each mutation that sends one builds it. */
export type NewNotification = Notification extends infer N ? (N extends Notification ? Omit<N, "id" | "readAt" | "createdAt"> : never) : never;

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type WarningNotificationData = z.infer<typeof WarningNotificationDataSchema>;
export type ReportResolvedNotificationData = z.infer<typeof ReportResolvedNotificationDataSchema>;
export type CommentedNotificationData = z.infer<typeof CommentedNotificationDataSchema>;
export type MentionedNotificationData = z.infer<typeof MentionedNotificationDataSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationView = z.infer<typeof NotificationViewSchema>;
