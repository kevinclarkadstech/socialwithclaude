import { ModerationActionTypeSchema } from "../types/moderation-action";
import { ReportKindSchema, ReportOutcomeSchema } from "../types/reported-item";

export const reportKinds = ReportKindSchema.options;
export const reportOutcomes = ReportOutcomeSchema.options;
export const moderationActionTypes = ModerationActionTypeSchema.options;

/** How far back a person's moderation history counts (warnings, removals, bans) when acting on a report. */
export const moderationHistoryDays = 90;
