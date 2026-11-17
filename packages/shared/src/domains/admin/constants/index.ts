import { ModerationActionTypeSchema } from "../types/moderation-action";
import { ReportKindSchema, ReportOutcomeSchema } from "../types/reported-item";

export const reportKinds = ReportKindSchema.options;
export const reportOutcomes = ReportOutcomeSchema.options;
export const moderationActionTypes = ModerationActionTypeSchema.options;
