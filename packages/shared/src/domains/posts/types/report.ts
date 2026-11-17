import { z } from "zod";

/** Reasons and review statuses shared by every kind of report (posts, comments, profiles, chat messages). */
export const ReportReasonSchema = z.enum([
    "spam",
    "harassment",
    "hate",
    "violence",
    "sexual_content",
    "child_safety",
    "impersonation",
    "scam",
    "prohibited_item",
    "other",
]);
export const ReportStatusSchema = z.enum(["open", "reviewed", "dismissed"]);

export type ReportReason = z.infer<typeof ReportReasonSchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
