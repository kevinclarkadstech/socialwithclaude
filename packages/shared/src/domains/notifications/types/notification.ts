import z from "zod";
import { ReportKindSchema, ReportOutcomeSchema } from "../../admin/types/reported-item";
import { ReportReasonSchema } from "../../posts/types/report";

/**
 * Something the app tells one person, shown on their Notifications page.
 * `data` depends on `type`; the app turns it into words (default messages),
 * so the wording can change without touching stored notifications.
 * - "warning": an admin warned them about something they posted or did.
 * - "report_resolved": a report they sent was dealt with, and how.
 */
const NotificationFieldsSchema = z.object({
    id: z.ulid(),
    // Who it's for.
    userId: z.ulid(),
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

export const NotificationSchema = z.discriminatedUnion("type", [
    NotificationFieldsSchema.extend({ type: z.literal("warning"), data: WarningNotificationDataSchema }),
    NotificationFieldsSchema.extend({ type: z.literal("report_resolved"), data: ReportResolvedNotificationDataSchema }),
]);

export const NotificationTypeSchema = z.enum(["warning", "report_resolved"]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type WarningNotificationData = z.infer<typeof WarningNotificationDataSchema>;
export type ReportResolvedNotificationData = z.infer<typeof ReportResolvedNotificationDataSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
