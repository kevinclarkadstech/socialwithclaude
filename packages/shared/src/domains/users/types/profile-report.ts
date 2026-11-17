import { z } from "zod";
import { BaseUserCreatedEntitySchema } from "../../../types/base-user-created-entity";
import { ReportReasonSchema, ReportStatusSchema } from "../../posts/types/report";
import { UserProfileSchema } from "./user-profile";

/**
 * A report about a person. created_by is the reporter, `reportedUserId` who
 * they reported. `snapshot` is the profile as it was when reported.
 */
export const ProfileReportSchema = BaseUserCreatedEntitySchema.extend({
    reportedUserId: z.ulid(),
    reason: ReportReasonSchema,
    details: z.string().trim().max(1000).nullable(),
    status: ReportStatusSchema,
    snapshot: UserProfileSchema,
});

export type ProfileReport = z.infer<typeof ProfileReportSchema>;
