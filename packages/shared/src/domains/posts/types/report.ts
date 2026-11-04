import { z } from "zod";

/** Reasons and review statuses shared by post and post comment reports. */
export const ReportReasonSchema = z.enum([
    "spam",
    "harassment",
    "hate",
    "violence",
    "sexual_content",
    "scam",
    "prohibited_item",
    "other",
]);
export const ReportStatusSchema = z.enum(["open", "reviewed", "dismissed"]);

export type ReportReason = z.infer<typeof ReportReasonSchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
