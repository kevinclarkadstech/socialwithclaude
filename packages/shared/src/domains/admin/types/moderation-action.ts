import z from "zod";
import { ReportKindSchema } from "./reported-item";

export const ModerationActionTypeSchema = z.enum([
    "dismiss_reports",
    "remove_content",
    "mark_reviewed",
    "ban_user",
    "unban_user",
    "warn_user",
]);

/**
 * One thing a moderator did, kept for good (appeals, store reviews).
 * created_by is the moderator; `subjectUserId` is whose content or account
 * it was about. `targetKind` and `targetId` say what, for report actions.
 */
export const ModerationActionSchema = z.object({
    id: z.ulid(),
    action: ModerationActionTypeSchema,
    subjectUserId: z.ulid(),
    targetKind: ReportKindSchema.nullable(),
    targetId: z.ulid().nullable(),
    note: z.string().trim().max(1000).nullable(),
    createdBy: z.ulid(),
    createdAt: z.iso.datetime(),
});

export type ModerationActionType = z.infer<typeof ModerationActionTypeSchema>;
export type ModerationAction = z.infer<typeof ModerationActionSchema>;
